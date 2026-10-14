import React, { useState } from 'react';
import { Terminal, Check, Copy, AlertTriangle, ShieldCheck, Cpu, ArrowUpRight } from 'lucide-react';

export const DeploymentView: React.FC = () => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const gcloudCommand = `gcloud run deploy accessibility-audit-studio \\
  --source . \\
  --platform managed \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --memory 2Gi \\
  --cpu 2 \\
  --concurrency 2 \\
  --timeout 120s \\
  --set-env-vars "NODE_ENV=production" \\
  --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"`;

  const dockerfileSnippet = `# Official Playwright base with pre-installed Chromium and dependencies
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8" aria-labelledby="deploy-title">
      <div>
        <h1 id="deploy-title" className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Deploying to Google Cloud Run
        </h1>
        <p className="text-sm text-slate-400">
          Honest container memory sizing, concurrency recommendations, and beginner deployment steps.
        </p>
      </div>

      {/* Honest Sizing Callout */}
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Important: AI Studio Starter Tier vs. Google Cloud Project with Billing</span>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          The default AI Studio Starter Tier allocates a small container with <strong>512 MiB RAM</strong>. While minimal static landing pages can complete in 512 MiB, real websites with complex JavaScript bundles, heavy fonts, and stylesheets will cause Chromium to be killed by the Linux Out-Of-Memory (OOM) killer.
        </p>
        <div className="text-xs text-amber-100 bg-amber-900/40 p-3 rounded-lg border border-amber-700/50">
          <strong>Recommendation:</strong> Deploy to a Google Cloud project with billing enabled, specifying <strong>1 GiB minimum</strong> (2 GiB recommended) and setting container concurrency to <strong>1 or 2</strong> so Chromium instances never compete for memory.
        </div>
      </div>

      {/* Checklist: What You Must Do Yourself */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">What You Must Do Yourself</h2>
        <ul className="text-xs text-slate-300 space-y-2.5">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-mono text-[11px] font-bold">1</span>
            <span>
              <strong>Add your GEMINI_API_KEY in Secrets:</strong> Open the AI Studio <strong>Secrets</strong> panel and ensure <code className="text-sky-300 font-mono">GEMINI_API_KEY</code> is set. The backend uses this for Gemini TTS voice summaries.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-mono text-[11px] font-bold">2</span>
            <span>
              <strong>Choose a Billing-Enabled Cloud Project:</strong> When clicking "Deploy to Cloud Run", pick a Google Cloud Project with billing active so you can choose 2GiB memory.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 font-mono text-[11px] font-bold">3</span>
            <span>
              <strong>Set Concurrency to 2:</strong> In the Cloud Run console under <em>Scaling & Container Settings</em>, set "Maximum concurrent requests per instance" to <strong>2</strong> to protect container memory.
            </span>
          </li>
        </ul>
      </div>

      {/* Deploy with gcloud */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" aria-hidden="true" />
            CLI Deployment Command
          </h2>
          <button
            type="button"
            onClick={() => copy(gcloudCommand, 'gcloud')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            {copiedSnippet === 'gcloud' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Command</span>
              </>
            )}
          </button>
        </div>
        <pre className="bg-[#090D16] p-4 rounded-lg border border-[#1E293B] text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          <code>{gcloudCommand}</code>
        </pre>
      </div>

      {/* Dockerfile Reference */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" aria-hidden="true" />
            Custom Dockerfile Reference (Playwright Ubuntu Base)
          </h2>
          <button
            type="button"
            onClick={() => copy(dockerfileSnippet, 'dockerfile')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            {copiedSnippet === 'dockerfile' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Dockerfile</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          The official Microsoft Playwright image ships with all essential Chromium system libraries pre-configured.
        </p>
        <pre className="bg-[#090D16] p-4 rounded-lg border border-[#1E293B] text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          <code>{dockerfileSnippet}</code>
        </pre>
      </div>
    </div>
  );
};
