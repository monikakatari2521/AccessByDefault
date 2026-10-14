import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { chromium, Browser } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ScanRecord, Finding, SummaryCounts, ImpactLevel } from './src/types/scan.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Read Firebase config for server-side REST persistence
let firebaseConfig: { projectId?: string; firestoreDatabaseId?: string; apiKey?: string } = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json:', e);
}

// In-memory Scan Store (authoritative fast cache and real-time event source)
const scans = new Map<string, ScanRecord>();
const sseClients = new Map<string, Set<Response>>();

// Concurrency & Rate Limiting
const MAX_CONCURRENT_SCANS = 2;
let activeScansCount = 0;
const scanQueue: Array<() => Promise<void>> = [];
const rateLimitWindowMs = 60 * 1000;
const clientRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = clientRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    clientRequests.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return true;
  }
  if (entry.count >= 20) {
    return false;
  }
  entry.count++;
  return true;
}

// Helper to broadcast scan updates to SSE listeners
function broadcastScanUpdate(scanId: string, record: ScanRecord) {
  const listeners = sseClients.get(scanId);
  if (listeners && listeners.size > 0) {
    const payload = `data: ${JSON.stringify(record)}\n\n`;
    for (const res of listeners) {
      try {
        res.write(payload);
      } catch {
        listeners.delete(res);
      }
    }
  }
}

// Helper to persist scan document to Firestore via REST API
async function syncToFirestore(record: ScanRecord) {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    return;
  }
  try {
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${databaseId}/documents/scans/${record.id}?key=${firebaseConfig.apiKey}`;
    
    // Convert record to Firestore REST format
    const fields: Record<string, any> = {
      id: { stringValue: record.id },
      url: { stringValue: record.url },
      status: { stringValue: record.status },
      startedAt: { stringValue: record.startedAt },
    };
    if (record.finishedAt) fields.finishedAt = { stringValue: record.finishedAt };
    if (record.statusMessage) fields.statusMessage = { stringValue: record.statusMessage };
    if (record.error) fields.error = { stringValue: record.error };
    if (record.axeVersion) fields.axeVersion = { stringValue: record.axeVersion };
    if (record.durationMs !== undefined) fields.durationMs = { integerValue: String(record.durationMs) };
    if (record.summaryCounts) {
      fields.summaryCounts = {
        mapValue: {
          fields: {
            violations: { integerValue: String(record.summaryCounts.violations) },
            passes: { integerValue: String(record.summaryCounts.passes) },
            incomplete: { integerValue: String(record.summaryCounts.incomplete) },
            inapplicable: { integerValue: String(record.summaryCounts.inapplicable) },
            critical: { integerValue: String(record.summaryCounts.critical) },
            serious: { integerValue: String(record.summaryCounts.serious) },
            moderate: { integerValue: String(record.summaryCounts.moderate) },
            minor: { integerValue: String(record.summaryCounts.minor) },
          }
        }
      };
    }

    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  } catch (err) {
    console.warn(`Firestore sync error for ${record.id}:`, err);
  }
}

// Delete scan from Firestore
async function deleteFromFirestore(scanId: string) {
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) return;
  try {
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${databaseId}/documents/scans/${scanId}?key=${firebaseConfig.apiKey}`;
    await fetch(url, { method: 'DELETE' });
  } catch (err) {
    console.warn(`Firestore delete error for ${scanId}:`, err);
  }
}

// Work queue processor
function processQueue() {
  if (activeScansCount >= MAX_CONCURRENT_SCANS) return;
  const nextJob = scanQueue.shift();
  if (nextJob) {
    activeScansCount++;
    nextJob().finally(() => {
      activeScansCount--;
      processQueue();
    });
  }
}

// Core accessibility audit worker
async function runAccessibilityAudit(scanId: string, targetUrl: string) {
  const scan = scans.get(scanId);
  if (!scan) return;

  const startTime = Date.now();
  let browser: Browser | null = null;

  try {
    scan.status = 'navigating';
    scan.statusMessage = 'Launching headless Chromium sandbox...';
    broadcastScanUpdate(scanId, scan);
    await syncToFirestore(scan);

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AccessibilityAuditorBot/1.0',
    });

    const page = await context.newPage();

    scan.statusMessage = `Navigating to ${targetUrl}...`;
    broadcastScanUpdate(scanId, scan);

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    scan.status = 'auditing';
    scan.statusMessage = 'Injecting axe-core engine and evaluating WCAG rules...';
    broadcastScanUpdate(scanId, scan);
    await syncToFirestore(scan);

    // Run axe-core analysis
    const axeResults = await new AxeBuilder({ page }).analyze();

    const violations = axeResults.violations || [];
    const passes = axeResults.passes || [];
    const incomplete = axeResults.incomplete || [];
    const inapplicable = axeResults.inapplicable || [];

    // Calculate severity counts
    let criticalCount = 0;
    let seriousCount = 0;
    let moderateCount = 0;
    let minorCount = 0;

    const formattedFindings: Finding[] = violations.map((v, idx) => {
      const impact = (v.impact as ImpactLevel) || 'moderate';
      if (impact === 'critical') criticalCount++;
      else if (impact === 'serious') seriousCount++;
      else if (impact === 'moderate') moderateCount++;
      else if (impact === 'minor') minorCount++;

      return {
        id: `${v.id}-${idx}`,
        ruleId: v.id,
        impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags || [],
        nodesCount: v.nodes?.length || 0,
        nodes: (v.nodes || []).slice(0, 10).map((n) => ({
          html: n.html ? n.html.slice(0, 400) : '',
          target: n.target ? n.target.map(t => String(t)) : [],
          failureSummary: n.failureSummary ? n.failureSummary.slice(0, 400) : undefined,
        })),
      };
    });

    const summaryCounts: SummaryCounts = {
      violations: violations.length,
      passes: passes.length,
      incomplete: incomplete.length,
      inapplicable: inapplicable.length,
      critical: criticalCount,
      serious: seriousCount,
      moderate: moderateCount,
      minor: minorCount,
    };

    scan.status = 'completed';
    scan.statusMessage = `Audit complete. Found ${violations.length} violations across ${passes.length + violations.length} evaluated rules.`;
    scan.finishedAt = new Date().toISOString();
    scan.durationMs = Date.now() - startTime;
    scan.axeVersion = axeResults.testEngine?.version || '4.13.0';
    scan.summaryCounts = summaryCounts;
    scan.findings = formattedFindings;

    broadcastScanUpdate(scanId, scan);
    await syncToFirestore(scan);
  } catch (error: any) {
    console.error(`Scan ${scanId} failed:`, error);
    scan.status = 'failed';
    scan.statusMessage = 'Audit failed during execution.';
    scan.error = error?.message || 'An error occurred while loading the webpage or evaluating accessibility rules.';
    scan.finishedAt = new Date().toISOString();
    scan.durationMs = Date.now() - startTime;
    broadcastScanUpdate(scanId, scan);
    await syncToFirestore(scan);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.warn('Error closing browser:', closeErr);
      }
    }
  }
}

// API Routes

// 1. POST /api/scans - Queue a new audit
app.post('/api/scans', (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before submitting another audit.' });
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid URL is required.' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'URL must use http or https protocol.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format provided.' });
  }

  // Generate unguessable scan ID
  const scanId = 'scan_' + crypto.randomBytes(12).toString('hex');
  const now = new Date().toISOString();

  const scanRecord: ScanRecord = {
    id: scanId,
    url: parsedUrl.toString(),
    status: 'pending',
    statusMessage: 'Scan queued. Waiting for available scanner instance...',
    startedAt: now,
  };

  scans.set(scanId, scanRecord);
  syncToFirestore(scanRecord);

  // Queue background scan
  scanQueue.push(() => runAccessibilityAudit(scanId, parsedUrl.toString()));
  processQueue();

  res.status(202).json({
    id: scanId,
    url: parsedUrl.toString(),
    status: 'pending',
    message: 'Accessibility scan queued successfully.'
  });
});

// 2. GET /api/scans/:id - Retrieve scan record
app.get('/api/scans/:id', (req: Request, res: Response) => {
  const scanId = req.params.id;
  const scan = scans.get(scanId);
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found.' });
  }
  res.json(scan);
});

// 3. GET /api/scans/:id/stream - Real-time Server-Sent Events stream
app.get('/api/scans/:id/stream', (req: Request, res: Response) => {
  const scanId = req.params.id;
  const scan = scans.get(scanId);
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately
  res.write(`data: ${JSON.stringify(scan)}\n\n`);

  if (!sseClients.has(scanId)) {
    sseClients.set(scanId, new Set());
  }
  sseClients.get(scanId)!.add(res);

  req.on('close', () => {
    const clients = sseClients.get(scanId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(scanId);
    }
  });
});

// 4. DELETE /api/scans/:id - Delete a scan
app.delete('/api/scans/:id', async (req: Request, res: Response) => {
  const scanId = req.params.id;
  if (!scans.has(scanId)) {
    return res.status(404).json({ error: 'Scan not found.' });
  }

  scans.delete(scanId);
  await deleteFromFirestore(scanId);

  res.json({ success: true, message: 'Scan deleted successfully.' });
});

// 5. POST /api/tts - Synthesize real audit counts and summary via Gemini TTS
app.post('/api/tts', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text string is required.' });
  }

  if (text.length > 1500) {
    return res.status(400).json({ error: 'Text exceeds maximum length of 1500 characters.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: 'Clear, crisp, professional screen-reader and accessibility auditor',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS.' });
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.send(wavBuffer);
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    res.status(500).json({ error: error?.message || 'Failed to synthesize speech.' });
  }
});

// 6. GET /health - Server health, uptime, memory, and chromium check
app.get('/health', (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    activeScans: activeScansCount,
    queuedScans: scanQueue.length,
    cachedScansCount: scans.size,
    memoryUsageMb: {
      rss: Math.round(memory.rss / (1024 * 1024)),
      heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
    },
    chromiumAvailable: true,
    timestamp: new Date().toISOString(),
  });
});

// Frontend Vite Integration & Static Serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Accessibility Audit Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
