import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Clock, Layers } from 'lucide-react';
import { ScanRecord } from '../types/scan.ts';

interface LiveStatusRegionProps {
  scan: ScanRecord | null;
  onCancel?: () => void;
}

export const LiveStatusRegion: React.FC<LiveStatusRegionProps> = ({ scan }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!scan || scan.status === 'completed' || scan.status === 'failed') {
      return;
    }
    const interval = setInterval(() => {
      const startTime = new Date(scan.startedAt).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 500);
    return () => clearInterval(interval);
  }, [scan]);

  if (!scan || scan.status === 'completed') {
    return (
      <div aria-live="polite" className="sr-only" role="status">
        {scan?.status === 'completed'
          ? `Audit complete for ${scan.url}. Total violations: ${scan.summaryCounts?.violations ?? 0}.`
          : ''}
      </div>
    );
  }

  const isFailed = scan.status === 'failed';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      className="max-w-4xl mx-auto my-6 p-6 bg-[#131B2E] border border-[#1E293B] rounded-xl shadow-xl transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {isFailed ? (
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            </div>
          )}

          <div>
            <h2 className="text-base font-semibold text-white">
              {isFailed ? 'Audit Terminated with Error' : 'Running Accessibility Audit'}
            </h2>
            <p className="text-sm text-slate-400 break-all">
              Target: <span className="text-slate-200 font-mono">{scan.url}</span>
            </p>
          </div>
        </div>

        {!isFailed && (
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-400 bg-[#090D16] px-3 py-1.5 rounded-lg border border-[#1E293B]">
            <Clock className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>{elapsed}s elapsed</span>
          </div>
        )}
      </div>

      {/* Progress Message */}
      <div className="mt-4 pt-4 border-t border-[#1E293B]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span className="text-sky-300 font-medium">Status: {scan.status.toUpperCase()}</span>
          <span>Unguessable ID: {scan.id}</span>
        </div>
        <p className="text-sm text-slate-300 bg-[#090D16] p-3 rounded-lg border border-[#1E293B] font-mono">
          {scan.statusMessage || 'Initializing scanner...'}
        </p>

        {isFailed && scan.error && (
          <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono leading-relaxed">
            {scan.error}
          </div>
        )}
      </div>

      {/* Real Step Progression */}
      {!isFailed && (
        <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
          <div className={`p-2 rounded border text-center transition-colors ${
            ['pending', 'navigating', 'auditing'].includes(scan.status)
              ? 'bg-sky-950/40 border-sky-800/60 text-sky-300'
              : 'bg-[#090D16] border-[#1E293B] text-slate-500'
          }`}>
            1. Queue
          </div>
          <div className={`p-2 rounded border text-center transition-colors ${
            ['navigating', 'auditing'].includes(scan.status)
              ? 'bg-sky-950/40 border-sky-800/60 text-sky-300'
              : 'bg-[#090D16] border-[#1E293B] text-slate-500'
          }`}>
            2. Chromium
          </div>
          <div className={`p-2 rounded border text-center transition-colors ${
            scan.status === 'auditing'
              ? 'bg-sky-950/40 border-sky-800/60 text-sky-300 animate-pulse'
              : 'bg-[#090D16] border-[#1E293B] text-slate-500'
          }`}>
            3. axe-core
          </div>
          <div className="p-2 rounded border text-center transition-colors bg-[#090D16] border-[#1E293B] text-slate-500">
            4. Report
          </div>
        </div>
      )}
    </div>
  );
};
