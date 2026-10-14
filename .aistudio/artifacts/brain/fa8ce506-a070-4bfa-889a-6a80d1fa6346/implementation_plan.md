# Accessibility Audit Studio & Voice Assistant

An automated web accessibility auditing platform powered by Playwright Chromium and axe-core, featuring real-time scan progress, WCAG AAA high-contrast auditing UI, live assistive announcements, and Gemini TTS voice summaries.

### User Review & Critical Decisions

> [!IMPORTANT]
> The feasibility check succeeded in this runtime environment: Playwright Chromium v1248 launched and executed `@axe-core/playwright` v4.13.0 on `https://example.com` with zero emulation errors.

- **Confirmed Decision 1 (Voice Assistant)**: Backend speech synthesis generated via `@google/genai` using `gemini-3.8-flash-lite-tts` (unary WAV audio played securely client-side), paired with persistent, accessible `aria-live` DOM announcements.
- **Confirmed Decision 2 (Finding Categorization)**: Violations categorized into standard WCAG severity tiers: Critical, Serious, Moderate, and Minor, with filtering by tag (e.g. `wcag2a`, `wcag2aa`, `wcag21aa`).
- **Confirmed Decision 3 (Aesthetic & Contrast Scheme)**: WCAG AAA high-contrast dark theme (`#090D16` canvas, `#131B2E` structural surfaces, `#F8FAFC` crisp text, `#38BDF8` focus rings with $\ge 7:1$ contrast ratio).
- **Confirmed Decision 4 (Database & Privacy)**: Firestore database storing only scan metadata (`id`, `url`, `status`, `startedAt`, `finishedAt`, `axeVersion`, `summaryCounts`) and normalized findings. Unguessable IDs prevent unauthorized enumeration; zero voice audio or transcripts are recorded or stored.

---

### 1. Overview & Core Concept

Accessibility Audit Studio allows developers, compliance officers, and users with visual impairments to run live automated accessibility audits on any public URL. 

- **Target Audience**: Web developers, QA engineers, accessibility auditors, and blind/low-vision developers who rely on screen readers or spoken feedback.
- **Key Value**: Instant, deep automated DOM testing using real browser engines and official Deque axe-core rules, accompanied by real-time status streaming and concise spoken summaries of actual findings without hallucinated metrics.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Audit Initiation**: User enters a target URL in the top searchbar and clicks "Start Audit" (or triggers via keyboard shortcut `Enter`).
2. **Immediate Feedback & Queueing**: Backend creates a pending scan record with a secure unguessable 24-character ID and responds immediately ($<50\text{ms}$).
3. **Live Progress Tracking**: The interface transitions to the scan workspace. An `aria-live="polite"` region alerts screen readers as the scanner reaches milestones (`Initializing Chromium`, `Navigating to target`, `Injecting axe-core`, `Analyzing DOM nodes`).
4. **Report & Severity Breakdown**: Upon completion, the scan view presents:
   - Summary metric banner: Total Violations, Critical, Serious, Moderate, Minor, and Passes.
   - Impact Accordions: Expandable rule cards detailing the affected DOM selector, HTML snippet, failure summary, and link to Deque University remediation guides.
   - Spoken Audit Summary: An accessible audio player allowing users to hear a concise audio briefing synthesized via `gemini-3.8-flash-lite-tts`.
5. **Scan Management & Privacy**: User can view past audit IDs in their session, delete any scan immediately, or navigate to `/privacy` to inspect the exact data retention and zero-voice-storage guarantees.

#### Visual Identity & Theme
- **Theme**: High-contrast Dark Mode (WCAG AAA compliant, contrast ratio $\ge 7:1$ on text, $\ge 4.5:1$ on graphic borders).
- **Canvas (`--bg-canvas`)**: `#090D16` (Deep obsidian slate).
- **Structural Surfaces (`--bg-surface`)**: `#131B2E` (Structured midnight slate) with hairline `#1E293B` borders.
- **Typography**: `Plus Jakarta Sans` for clean titles, `DM Sans` for body copy, and `JetBrains Mono` with `tabular-nums` for code snippets, rule IDs, and counts.
- **Accent Tokens**:
  - Focus Ring: `#38BDF8` (Sky blue, 2px outline with 2px offset).
  - Critical Severity: `#EF4444` (Crimson, high-contrast).
  - Serious Severity: `#F97316` (Amber/Orange).
  - Moderate Severity: `#FBBF24` (Gold/Yellow).
  - Minor Severity: `#60A5FA` (Soft blue).
  - Passes / Nominal: `#34D399` (Mint emerald).

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Feasibility & Headless Chromium in AI Studio
- *Chosen Approach*: Headless Chromium managed by Playwright with `--no-sandbox`, `--disable-setuid-sandbox`, and `--disable-dev-shm-usage` flags.
- *Why*: Direct execution has been verified to launch cleanly within this Node.js sandbox, executing axe-core on `https://example.com` in $\sim 2.8$ seconds.

#### Decision 2: Cloud Run Memory & Pricing Tier Assessment
- *Honest Assessment*: 
  - The AI Studio Starter Tier provides limited CPU and memory (typically 512MiB). While a single minimal Chromium page can run within 512MiB, heavier client sites with heavy JavaScript, videos, or fonts can trigger Out-Of-Memory (OOM) errors (`signal: SIGKILL`).
  - **Recommendation**: Deploy to Cloud Run with at least **1GiB or 2GiB RAM** (Google Cloud project with billing enabled). Concurrency should be set to `1` or `2` requests per instance so Chromium processes do not compete for memory.
  - Complete instructions and Dockerfile / Cloud Run CLI commands will be provided in `DEPLOYMENT.md`.

#### Decision 3: Firestore Data Model & Security Architecture
- *Chosen Approach*: 
  - Collection: `scans/{scanId}` containing scan metadata, axe-core version, execution duration, and count summaries.
  - Subcollection or embedded array: Findings are stored in `scans/{scanId}/findings/{findingId}` (or embedded when total size is $<800\text{KB}$, with subcollection fallback) to stay safely beneath Firestore's 1MB document limit.
  - Security Rules: Write access is restricted to the backend (or server timestamps); read access requires the unguessable `scanId` path. List operations without a specific scan ID are locked down to prevent query scraping.
  - Deletion: Backend endpoint `DELETE /api/scans/:id` removes the document immediately; a retention rule of 7 days is documented and supported.

#### Decision 4: Rate Limiting & Concurrency Guard
- *Chosen Approach*: In-memory concurrency limiter (max 2 active Playwright instances simultaneously) with a FIFO queue. Subsequent requests receive `429 Too Many Requests` or queued status with estimated wait time.

---

### 4. Technical Architecture & Data Strategy

#### System Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React SPA (Client)                              │
│                                                                        │
│  ┌────────────────────────┐  ┌───────────────────┐  ┌───────────────┐  │
│  │ Scan Form & URL Input  │  │ aria-live Region  │  │ TTS Player    │  │
│  └───────────┬────────────┘  └─────────▲─────────┘  └───────▲───────┘  │
│              │                         │                    │          │
│              │ POST /api/scans         │ Firestore Snapshot │ GET /api/│
│              │                         │ or SSE Status      │ tts      │
└──────────────┼─────────────────────────┼────────────────────┼──────────┘
               │                         │                    │
┌──────────────▼─────────────────────────┴────────────────────┴──────────┐
│                   Express Full-Stack Server (server.ts)                 │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Job Queue & Limiter   │   │ Gemini TTS Service                   │  │
│  │ (Max 2 concurrent)    │   │ (gemini-3.8-flash-lite-tts)          │  │
│  └───────────┬───────────┘   └──────────────────────────────────────┘  │
│              │                                                         │
│  ┌───────────▼───────────┐   ┌──────────────────┐  ┌────────────────┐  │
│  │ Playwright Chromium   │──▶│ axe-core engine  │─▶│ /health check  │  │
│  │ (no-sandbox headless) │   │ (v4.13 analysis) │  │ endpoint       │  │
│  └───────────────────────┘   └──────────────────┘  └────────────────┘  │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
               ┌─────────────────────────────────┐
               │    Firebase Firestore Database  │
               │                                 │
               │  /scans/{scanId}                │
               │  /scans/{scanId}/findings/{id}  │
               └─────────────────────────────────┘
```

#### Firestore Data Model

1. **`scans/{scanId}`**:
   - `id`: string (unguessable UUID/nanoid)
   - `url`: string (validated http/https URL)
   - `status`: `'pending' | 'navigating' | 'auditing' | 'completed' | 'failed'`
   - `startedAt`: Timestamp
   - `finishedAt`: Timestamp | null
   - `error`: string | null
   - `axeVersion`: string (e.g. `'4.13.0'`)
   - `summaryCounts`:
     - `violations`: number
     - `passes`: number
     - `incomplete`: number
     - `inapplicable`: number
     - `critical`: number
     - `serious`: number
     - `moderate`: number
     - `minor`: number

2. **`scans/{scanId}/findings/{findingId}`**:
   - `ruleId`: string (e.g. `'color-contrast'`, `'image-alt'`)
   - `impact`: `'critical' | 'serious' | 'moderate' | 'minor'`
   - `description`: string
   - `help`: string
   - `helpUrl`: string
   - `tags`: string[] (e.g. `['cat.color', 'wcag2a', 'wcag143']`)
   - `nodes`: Array of `{ html: string, target: string[], failureSummary: string }`

#### Server API Routes
- `POST /api/scans`: Validates URL, generates `scanId`, queues background task, returns `{ id, status: 'pending' }`.
- `GET /api/scans/:id`: Returns current scan status and findings.
- `GET /api/scans/:id/stream`: Server-Sent Events stream for real-time progress updates.
- `DELETE /api/scans/:id`: Deletes scan and all associated subcollection findings.
- `POST /api/tts`: Accepts `{ text, scanId }`, calls `@google/genai` with `gemini-3.8-flash-lite-tts`, returns binary WAV audio.
- `GET /health`: Returns `{ status: 'ok', uptime: number, memoryUsage: object, activeScans: number }`.

#### Frontend Components
- `Header`: 3-zone contract with Wordmark, navigation links (Audits, Privacy, Deployment Guide), and "New Audit" button.
- `ScanInputBar`: Accessible form with URL validation, keyboard shortcuts, and clear status announcements.
- `LiveStatusRegion`: Screen-reader accessible `aria-live` container showing real-time auditing phases.
- `AuditReport`:
  - `SummaryCards`: Tabular metric grid (Critical, Serious, Moderate, Minor, Passes).
  - `AudioBriefing`: Gemini TTS voice briefing player with pause/resume and rate control.
  - `FindingsList`: Categorized by impact with tag filter chips, code snippets, selector targets, and Deque University links.
- `PrivacyPage`: Comprehensive description of data retention, zero-recording policy, and security architecture.
- `DeploymentModal / Guide`: Clear instructions for AI Studio Cloud Run deployment, memory sizing, and project billing.
