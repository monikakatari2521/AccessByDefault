# Cloud Run & AI Studio Deployment Guide

This guide walks you through deploying **Accessibility Audit Studio & Voice Assistant** to Google Cloud Run, covering compute sizing, memory requirements for Playwright Chromium, environment secrets, and step-by-step instructions.

---

## 1. Cloud Run Tier & Memory Requirements (Honest Sizing Assessment)

> [!WARNING]
> **Can it run on AI Studio's Starter Tier?**
> The default Cloud Run Starter Tier provisions a container with **512 MiB of RAM** and shared CPU.
> While minimal pages (such as `https://example.com`) can complete within 512 MiB, real-world websites with heavy JavaScript, complex DOM trees, embedded fonts, and stylesheets require significant memory. In 512 MiB, Chromium will occasionally be killed by the Linux OOM (Out Of Memory) killer with `signal: SIGKILL`.

### Recommended Production Tier:
- **Project Tier**: A Google Cloud Project with **Billing Enabled** (standard Cloud Run pricing includes 2 million requests and 360,000 GiB-seconds free every month under the Google Cloud Free Tier).
- **Container Memory**: **1 GiB minimum**, **2 GiB recommended** (`--memory 2Gi`).
- **Container CPU**: **1 vCPU minimum**, **2 vCPU recommended** (`--cpu 2`).
- **Concurrency**: Set container concurrency to **1 or 2** (`--concurrency 2`). This prevents multiple incoming audits from spawning simultaneous Chromium instances that exhaust container RAM.

---

## 2. Secrets & Environment Variables

All sensitive credentials must be maintained exclusively in Cloud Run environment variables or Secret Manager, never in client-side frontend code:

| Variable | Required? | Source / Location | Purpose |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Required for TTS | AI Studio **Secrets** panel or Google AI Studio | Powers Gemini TTS (`gemini-3.8-flash-lite-tts`) for voice briefings. |
| `PORT` | Auto-set | Cloud Run default (`8080` in Cloud Run, `3000` in dev) | Web server port. |
| `NODE_ENV` | Optional | Set to `production` | Enables optimized static asset serving. |

---

## 3. Step-by-Step Deployment Instructions

### Option A: 1-Click Deploy via AI Studio UI
1. In Google AI Studio Build, locate the top-right header and click **Deploy**.
2. Select **Cloud Run**.
3. Choose your Google Cloud Project. If prompted, select a project with billing enabled to allow 1GiB/2GiB memory allocation.
4. Verify that `GEMINI_API_KEY` is present in the Secrets section.
5. Click **Deploy**. AI Studio builds the container and launches your service URL.

---

### Option B: Deploying with Google Cloud CLI (`gcloud`)

If deploying directly from your local terminal or CI/CD pipeline:

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Build and Deploy to Cloud Run with 2GB RAM and 2 concurrent requests
gcloud run deploy accessibility-audit-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 2 \
  --timeout 120s \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

---

## 4. Playwright Chromium Dockerfile Reference

When building a custom container image outside AI Studio, use the official Microsoft Playwright container base to guarantee all required Linux shared libraries (`libnss3`, `libatk`, `libgbm`, `libasound2`) are pre-installed:

```dockerfile
# Official Playwright base image includes Chromium and required system dependencies
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app

# Copy package descriptors and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application sources
COPY . .

# Build Vite frontend bundle
RUN npm run build

# Expose port (Cloud Run sets PORT=8080)
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Start server using tsx
CMD ["npm", "start"]
```

---

## 5. Health Check Verification

Once deployed, verify your service health by querying the `/health` endpoint:

```bash
curl https://YOUR-CLOUD-RUN-URL/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "uptimeSeconds": 142,
  "activeScans": 0,
  "queuedScans": 0,
  "cachedScansCount": 1,
  "memoryUsageMb": {
    "rss": 128,
    "heapUsed": 45,
    "heapTotal": 62
  },
  "chromiumAvailable": true,
  "timestamp": "2026-10-14T13:00:00.000Z"
}
```

---

## 6. What You Must Do Yourself
- [ ] Ensure your Google Cloud project has billing enabled so Cloud Run can allocate $\ge 1\text{GiB}$ RAM.
- [ ] Add your `GEMINI_API_KEY` to the AI Studio Secrets panel.
- [ ] For high-traffic production use, set Cloud Run concurrency to `2` to prevent memory contention.
