import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SummaryCounts } from '../types/scan.ts';

interface SummaryMetricsProps {
  counts: SummaryCounts;
  durationMs?: number;
  axeVersion?: string;
  onFilterSeverity?: (severity: string | null) => void;
  selectedSeverity?: string | null;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  counts,
  durationMs,
  axeVersion,
  onFilterSeverity,
  selectedSeverity,
}) => {
  return (
    <section aria-labelledby="metrics-heading" className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
        <h2 id="metrics-heading" className="text-xl font-bold tracking-tight text-white">
          Executive Audit Summary
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Engine: axe-core v{axeVersion || '4.13.0'}</span>
          {durationMs !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Duration: {(durationMs / 1000).toFixed(2)}s</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Violations */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Violations</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {counts.violations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Found on page</div>
        </div>

        {/* Critical */}
        <button
          type="button"
          onClick={() => onFilterSeverity?.(selectedSeverity === 'critical' ? null : 'critical')}
          className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
            selectedSeverity === 'critical'
              ? 'bg-red-950/60 border-red-500 ring-2 ring-red-500/30'
              : 'bg-[#131B2E] border-[#1E293B] hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-red-400 mb-2">
            <span className="text-xs font-semibold">Critical</span>
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono tabular-nums">
            {counts.critical}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Blocks users</div>
        </button>

        {/* Serious */}
        <button
          type="button"
          onClick={() => onFilterSeverity?.(selectedSeverity === 'serious' ? null : 'serious')}
          className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
            selectedSeverity === 'serious'
              ? 'bg-orange-950/60 border-orange-500 ring-2 ring-orange-500/30'
              : 'bg-[#131B2E] border-[#1E293B] hover:border-orange-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-orange-400 mb-2">
            <span className="text-xs font-semibold">Serious</span>
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-orange-400 font-mono tabular-nums">
            {counts.serious}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Severe barriers</div>
        </button>

        {/* Moderate */}
        <button
          type="button"
          onClick={() => onFilterSeverity?.(selectedSeverity === 'moderate' ? null : 'moderate')}
          className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
            selectedSeverity === 'moderate'
              ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-[#131B2E] border-[#1E293B] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold">Moderate</span>
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
            {counts.moderate}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Usability friction</div>
        </button>

        {/* Minor */}
        <button
          type="button"
          onClick={() => onFilterSeverity?.(selectedSeverity === 'minor' ? null : 'minor')}
          className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
            selectedSeverity === 'minor'
              ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-[#131B2E] border-[#1E293B] hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-semibold">Minor</span>
            <Info className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono tabular-nums">
            {counts.minor}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Low-impact items</div>
        </button>

        {/* Passed Rules */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold">Passed</span>
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {counts.passes}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Fully compliant rules</div>
        </div>
      </div>
    </section>
  );
};
