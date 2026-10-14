import React from 'react';
import { ShieldCheck, Server, Lock, Terminal, PlusCircle } from 'lucide-react';

export type ActiveTab = 'audit' | 'health' | 'privacy' | 'deployment';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onNewScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab, onNewScan }) => {
  return (
    <header className="border-b border-[#1E293B] bg-[#090D16]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('audit');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white focus-visible:ring-2 focus-visible:ring-sky-400 rounded-md py-1"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="font-display">AuditAccess</span>
          </a>
        </div>

        {/* Zone 2: Navigation Links (single line, whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => onSelectTab('audit')}
            className={`transition-colors whitespace-nowrap cursor-pointer py-1 ${
              activeTab === 'audit'
                ? 'text-sky-400 font-semibold border-b-2 border-sky-400 -mb-0.5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audits & Reports
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('health')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer py-1 ${
              activeTab === 'health'
                ? 'text-sky-400 font-semibold border-b-2 border-sky-400 -mb-0.5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" aria-hidden="true" />
            System Health
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('privacy')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer py-1 ${
              activeTab === 'privacy'
                ? 'text-sky-400 font-semibold border-b-2 border-sky-400 -mb-0.5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
            Privacy & Retention
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('deployment')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer py-1 ${
              activeTab === 'deployment'
                ? 'text-sky-400 font-semibold border-b-2 border-sky-400 -mb-0.5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" aria-hidden="true" />
            Deploy to Cloud Run
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectTab('audit');
              onNewScan();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 focus-visible:ring-offset-[#090D16]"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>New Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
