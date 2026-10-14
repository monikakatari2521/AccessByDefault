import React, { useEffect, useState } from 'react';
import { Server, Activity, Cpu, HardDrive, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { HealthStatus } from '../types/scan.ts';

export const HealthView: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/health');
      if (!res.ok) throw new Error(`Health check returned ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to query /health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remainingSecs = seconds % 60;
    const remainingMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remainingMins}m ${remainingSecs}s`;
    if (mins > 0) return `${mins}m ${remainingSecs}s`;
    return `${remainingSecs}s`;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6" aria-labelledby="health-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 id="health-title" className="text-3xl font-extrabold tracking-tight text-white mb-1">
            System & Container Health
          </h1>
          <p className="text-sm text-slate-400">
            Real-time metrics from the backend endpoint <code className="text-sky-300 font-mono">/health</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#131B2E] border border-[#1E293B] hover:border-sky-400 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} aria-hidden="true" />
          <span>Refresh Status</span>
        </button>
      </div>

      {error ? (
        <div className="bg-red-950/40 border border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Error connecting to health service: {error}</span>
        </div>
      ) : !health ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs">
          Loading system telemetry...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Status Banner */}
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">All Systems Operational</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Chromium sandbox ready · axe-core engine active · Concurrency limiter nominal
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-slate-400">
              <div>Uptime</div>
              <div className="text-white font-semibold tabular-nums">{formatUptime(health.uptimeSeconds)}</div>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Active Scans */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Active Scans</span>
                <Activity className="w-4 h-4 text-sky-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {health.activeScans} / 2
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Concurrency cap: 2 max</div>
            </div>

            {/* Queued Scans */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Queued Jobs</span>
                <Server className="w-4 h-4 text-slate-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {health.queuedScans}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Pending FIFO workers</div>
            </div>

            {/* RSS Memory */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Memory RSS</span>
                <HardDrive className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {health.memoryUsageMb.rss} MB
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Resident Set Size</div>
            </div>

            {/* Node Heap */}
            <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Heap Allocated</span>
                <Cpu className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-white font-mono tabular-nums">
                {health.memoryUsageMb.heapUsed} / {health.memoryUsageMb.heapTotal} MB
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Active V8 memory</div>
            </div>
          </div>

          {/* Raw JSON inspection for developers */}
          <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-2">
              Raw /health Payload:
            </h3>
            <pre className="bg-[#090D16] p-4 rounded-lg border border-[#1E293B] text-xs font-mono text-slate-300 overflow-x-auto">
              <code>{JSON.stringify(health, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
