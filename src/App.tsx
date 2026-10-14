import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType } from './lib/firebase.ts';
import { Header, ActiveTab } from './components/Header.tsx';
import { ScanForm } from './components/ScanForm.tsx';
import { LiveStatusRegion } from './components/LiveStatusRegion.tsx';
import { SummaryMetrics } from './components/SummaryMetrics.tsx';
import { AudioBriefing } from './components/AudioBriefing.tsx';
import { FindingsList } from './components/FindingsList.tsx';
import { PrivacyView } from './components/PrivacyView.tsx';
import { HealthView } from './components/HealthView.tsx';
import { DeploymentView } from './components/DeploymentView.tsx';
import { ScanRecord, ImpactLevel } from './types/scan.ts';
import { Trash2, Download, Share2, Check, RefreshCw, ExternalLink } from 'lucide-react';

interface RecentScanItem {
  id: string;
  url: string;
  timestamp: string;
  violationsCount?: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('audit');
  const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load recent scans from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('audit_recent_scans');
      if (stored) {
        setRecentScans(JSON.parse(stored));
      }
    } catch {}

    // Verify Firestore connection on mount (Firebase skill requirement)
    testConnection();

    // Check if URL has ?scan= parameter
    const params = new URLSearchParams(window.location.search);
    const initialScanId = params.get('scan');
    if (initialScanId) {
      loadScanById(initialScanId);
    }
  }, []);

  const saveRecentScan = (scan: ScanRecord) => {
    setRecentScans((prev) => {
      const filtered = prev.filter((s) => s.id !== scan.id);
      const updated = [
        {
          id: scan.id,
          url: scan.url,
          timestamp: scan.startedAt,
          violationsCount: scan.summaryCounts?.violations,
        },
        ...filtered,
      ].slice(0, 10);
      try {
        localStorage.setItem('audit_recent_scans', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Subscribe to real-time updates via SSE and Firestore
  const subscribeToScan = (scanId: string) => {
    // Clean up existing SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // 1. Connect SSE stream
    const sse = new EventSource(`/api/scans/${scanId}/stream`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data: ScanRecord = JSON.parse(event.data);
        setCurrentScan(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setIsLoading(false);
          saveRecentScan(data);
          sse.close();
        }
      } catch (e) {
        console.warn('Error parsing SSE scan update:', e);
      }
    };

    sse.onerror = () => {
      // If SSE disconnects, fall back to Firestore snapshot listener
      sse.close();
    };

    // 2. Attach Firestore snapshot listener
    try {
      const scanDocRef = doc(db, 'scans', scanId);
      const unsubscribe = onSnapshot(
        scanDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as ScanRecord;
            setCurrentScan((prev) => ({ ...prev, ...data }));
            if (data.status === 'completed' || data.status === 'failed') {
              setIsLoading(false);
              saveRecentScan(data);
            }
          }
        },
        (error) => {
          // Standardized error handler per skill
          console.warn('Firestore snapshot listener failed (using SSE fallback):', error);
        }
      );

      return () => {
        unsubscribe();
        sse.close();
      };
    } catch (err) {
      console.warn('Failed to attach Firestore listener:', err);
    }
  };

  // Load existing scan by ID
  const loadScanById = async (scanId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) throw new Error('Scan not found');
      const data: ScanRecord = await res.json();
      setCurrentScan(data);
      if (data.status === 'pending' || data.status === 'navigating' || data.status === 'auditing') {
        subscribeToScan(scanId);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to load scan:', err);
      setIsLoading(false);
    }
  };

  // Start new scan
  const handleStartScan = async (targetUrl: string) => {
    setIsLoading(true);
    setCurrentScan(null);
    setSelectedSeverity(null);

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const initialData: { id: string; url: string; status: string } = await res.json();

      const newRecord: ScanRecord = {
        id: initialData.id,
        url: initialData.url,
        status: 'pending',
        statusMessage: 'Scan queued in container...',
        startedAt: new Date().toISOString(),
      };

      setCurrentScan(newRecord);

      // Update URL search query
      const url = new URL(window.location.href);
      url.searchParams.set('scan', initialData.id);
      window.history.pushState({}, '', url.toString());

      // Subscribe to real-time updates
      subscribeToScan(initialData.id);
    } catch (err: any) {
      setIsLoading(false);
      setCurrentScan({
        id: 'error',
        url: targetUrl,
        status: 'failed',
        error: err.message || 'Failed to start accessibility audit.',
        startedAt: new Date().toISOString(),
      });
    }
  };

  // Delete scan
  const handleDeleteScan = async (scanId: string) => {
    if (!window.confirm('Are you sure you want to delete this scan report permanently?')) {
      return;
    }

    try {
      await fetch(`/api/scans/${scanId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete on server:', err);
    }

    setCurrentScan(null);
    setRecentScans((prev) => {
      const updated = prev.filter((s) => s.id !== scanId);
      localStorage.setItem('audit_recent_scans', JSON.stringify(updated));
      return updated;
    });

    const url = new URL(window.location.href);
    url.searchParams.delete('scan');
    window.history.pushState({}, '', url.toString());
  };

  // Share Link
  const handleShare = () => {
    if (!currentScan) return;
    const shareUrl = `${window.location.origin}?scan=${currentScan.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download JSON Report
  const handleDownloadReport = () => {
    if (!currentScan) return;
    const blob = new Blob([JSON.stringify(currentScan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-${currentScan.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-[#F8FAFC]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewScan={() => {
          setCurrentScan(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('scan');
          window.history.pushState({}, '', url.toString());
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'health' && <HealthView />}
        {activeTab === 'privacy' && <PrivacyView />}
        {activeTab === 'deployment' && <DeploymentView />}

        {activeTab === 'audit' && (
          <div>
            {/* Form */}
            <ScanForm onSubmit={handleStartScan} isLoading={isLoading} />

            {/* Live Status Region */}
            <LiveStatusRegion scan={currentScan} />

            {/* Audit Report View */}
            {currentScan && currentScan.status === 'completed' && currentScan.summaryCounts && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Report Header Bar */}
                <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-sky-400 font-mono font-medium">Unguessable ID:</span>
                      <code className="text-xs text-slate-300 bg-[#090D16] px-2 py-0.5 rounded border border-[#1E293B] font-mono">
                        {currentScan.id}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>URL:</span>
                      <a
                        href={currentScan.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-white hover:text-sky-300 underline font-mono flex items-center gap-1"
                      >
                        <span>{currentScan.url}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#090D16] border border-[#1E293B] hover:border-sky-400 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Share Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#090D16] border border-[#1E293B] hover:border-sky-400 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Download raw JSON report"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Export JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteScan(currentScan.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/60 text-xs font-semibold text-red-300 hover:text-red-200 rounded-lg transition-colors cursor-pointer"
                      title="Permanently delete this scan from database"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Gemini TTS Audio Briefing */}
                <AudioBriefing scan={currentScan} />

                {/* Executive Summary Metrics */}
                <SummaryMetrics
                  counts={currentScan.summaryCounts}
                  durationMs={currentScan.durationMs}
                  axeVersion={currentScan.axeVersion}
                  selectedSeverity={selectedSeverity}
                  onFilterSeverity={setSelectedSeverity}
                />

                {/* Detailed Findings */}
                <FindingsList
                  findings={currentScan.findings || []}
                  selectedSeverity={selectedSeverity}
                  onSelectSeverity={setSelectedSeverity}
                />
              </div>
            )}

            {/* Recent Scans Session Strip (when not on an active completed scan) */}
            {(!currentScan || currentScan.status !== 'completed') && recentScans.length > 0 && (
              <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-[#1E293B]">
                <h3 className="text-sm font-semibold text-slate-400 mb-3 font-display">
                  Recent Audits in this Session
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recentScans.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => loadScanById(item.id)}
                      className="flex items-center justify-between p-3 bg-[#131B2E] border border-[#1E293B] hover:border-sky-400/60 rounded-lg text-left transition-colors cursor-pointer"
                    >
                      <div className="overflow-hidden mr-2">
                        <div className="text-xs text-white font-mono truncate">{item.url}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {item.violationsCount !== undefined && (
                        <div className="text-xs font-mono font-semibold text-amber-400 shrink-0">
                          {item.violationsCount} issues
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E293B] bg-[#090D16] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Built with Playwright Chromium, axe-core v4.13.0, and Firebase Firestore.
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Privacy & Retention
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('deployment')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cloud Run Sizing
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              /health
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
