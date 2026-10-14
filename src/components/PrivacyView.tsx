import React from 'react';
import { ShieldCheck, Lock, Trash2, Clock, EyeOff, Server, Database } from 'lucide-react';

export const PrivacyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8" aria-labelledby="privacy-title">
      <div>
        <h1 id="privacy-title" className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Privacy Policy & Data Retention
        </h1>
        <p className="text-sm text-slate-400">
          Complete transparency on what AuditAccess stores, how scans are secured, and our strict zero-voice-storage architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Zero Voice Audio Storage */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <EyeOff className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-white">Zero Voice Recordings or Transcripts</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Voice Assistant is strictly an output synthesizer. When you click "Play Briefing", Gemini TTS generates a streaming WAV audio clip on the backend containing solely the verified violation counts.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>No microphone access is ever requested or enabled.</li>
            <li>No spoken transcripts or generated audio files are persisted on servers or Firestore.</li>
            <li>Audio streams exist only in transient browser memory during playback.</li>
          </ul>
        </div>

        {/* Card 2: Unguessable IDs & Zero Scraping */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-white">Cryptographic Unguessable IDs</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            In v1, user accounts and passwords are not required. Instead, each audit report is keyed to a 24-character cryptographic token (<code className="text-sky-300 font-mono">scan_[random]</code>).
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Clients cannot enumerate or list other users' audits.</li>
            <li>Firestore security rules block all collection listing queries.</li>
            <li>Only someone in possession of the exact unguessable ID can view a report.</li>
          </ul>
        </div>

        {/* Card 3: What Is Stored */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Database className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-white">Exactly What Is Stored</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            We store only the bare technical artifacts required to render your accessibility report:
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside font-mono text-[11px]">
            <li>Target URL audited (e.g. https://example.com)</li>
            <li>Audit timestamps (startedAt, finishedAt)</li>
            <li>axe-core engine version (e.g. 4.13.0)</li>
            <li>Violation summary counts (Critical, Serious, Moderate, Minor)</li>
            <li>Affected DOM selectors and truncated HTML snippets</li>
          </ul>
        </div>

        {/* Card 4: Retention & Self-Deletion */}
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-white">7-Day Retention & Instant Deletion</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            You retain absolute ownership of all audit data generated during your session.
          </p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Immediate Deletion: Click "Delete Scan" on any report to instantly purge it from backend memory and Firestore.</li>
            <li>Automated Retention: Stale audits are scheduled for automated expiration after 7 days.</li>
            <li>No third-party trackers, ad scripts, or data brokers.</li>
          </ul>
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" aria-hidden="true" />
          Backend-Only Mutation Architecture
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          In strict compliance with zero-trust design, client browsers have read-only access to single audit documents via unguessable ID. All creation, status transitions, and data mutations are executed exclusively by the secure backend server running inside Cloud Run. This prevents client spoofing, unauthorized tampering, or malicious alterations to accessibility records.
        </p>
      </div>
    </div>
  );
};
