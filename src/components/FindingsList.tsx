import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Copy, Check, Search, Code, AlertCircle } from 'lucide-react';
import { Finding, ImpactLevel } from '../types/scan.ts';

interface FindingsListProps {
  findings: Finding[];
  selectedSeverity?: string | null;
  onSelectSeverity?: (severity: string | null) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  selectedSeverity,
  onSelectSeverity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available WCAG / topic tags
  const tagsList = useMemo(() => {
    const set = new Set<string>();
    findings.forEach((f) => f.tags.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 8);
  }, [findings]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedSeverity && f.impact !== selectedSeverity) return false;
      if (selectedTag && !f.tags.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchId = f.ruleId.toLowerCase().includes(query);
        const matchDesc = f.description.toLowerCase().includes(query);
        const matchHelp = f.help.toLowerCase().includes(query);
        return matchId || matchDesc || matchHelp;
      }
      return true;
    });
  }, [findings, selectedSeverity, selectedTag, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getImpactColor = (impact: ImpactLevel) => {
    switch (impact) {
      case 'critical':
        return 'text-red-400 border-red-500/40 bg-red-950/30';
      case 'serious':
        return 'text-orange-400 border-orange-500/40 bg-orange-950/30';
      case 'moderate':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
      case 'minor':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/30';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-900';
    }
  };

  return (
    <section aria-labelledby="findings-heading" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 id="findings-heading" className="text-xl font-bold tracking-tight text-white">
            Accessibility Violations ({filteredFindings.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Grouped by severity impact level with remediation guidance.
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search rules or guidelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#131B2E] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            aria-label="Filter findings by text"
          />
        </div>
      </div>

      {/* Segmented Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectSeverity?.(null)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
            selectedSeverity === null
              ? 'bg-sky-600 border-sky-500 text-white'
              : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:text-white'
          }`}
        >
          All Severities
        </button>
        <button
          type="button"
          onClick={() => onSelectSeverity?.('critical')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
            selectedSeverity === 'critical'
              ? 'bg-red-900/60 border-red-500 text-red-200'
              : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:text-red-400'
          }`}
        >
          Critical Only
        </button>
        <button
          type="button"
          onClick={() => onSelectSeverity?.('serious')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
            selectedSeverity === 'serious'
              ? 'bg-orange-900/60 border-orange-500 text-orange-200'
              : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:text-orange-400'
          }`}
        >
          Serious Only
        </button>
        <button
          type="button"
          onClick={() => onSelectSeverity?.('moderate')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
            selectedSeverity === 'moderate'
              ? 'bg-amber-900/60 border-amber-500 text-amber-200'
              : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:text-amber-400'
          }`}
        >
          Moderate Only
        </button>
        <button
          type="button"
          onClick={() => onSelectSeverity?.('minor')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
            selectedSeverity === 'minor'
              ? 'bg-blue-900/60 border-blue-500 text-blue-200'
              : 'bg-[#131B2E] border-[#1E293B] text-slate-400 hover:text-blue-400'
          }`}
        >
          Minor Only
        </button>

        {tagsList.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-500 overflow-x-auto py-1">
            <span className="shrink-0">Tag:</span>
            {tagsList.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors shrink-0 ${
                  selectedTag === tag
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-12 text-center">
          <p className="text-base text-slate-300 font-semibold mb-1">No violations match your current filters</p>
          <p className="text-xs text-slate-500">
            Try resetting your search query or severity filter to see all findings.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const isExpanded = !!expandedFindings[finding.id];
            const impactStyle = getImpactColor(finding.impact);

            return (
              <article
                key={finding.id}
                className="bg-[#131B2E] border border-[#1E293B] rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Header Row */}
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold font-mono uppercase tracking-wider border ${impactStyle}`}>
                        {finding.impact}
                      </span>
                      <h3 className="text-base font-semibold text-white font-mono">
                        {finding.ruleId}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        {finding.nodesCount} {finding.nodesCount === 1 ? 'affected element' : 'affected elements'}
                      </span>
                      {finding.helpUrl && (
                        <a
                          href={finding.helpUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 hover:underline transition-colors"
                        >
                          <span>Remediation Guide</span>
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 font-medium leading-relaxed mb-2">
                    {finding.help}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {finding.description}
                  </p>

                  {/* Clean unboxed tags with subtle separators */}
                  {finding.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                      <span>Standards:</span>
                      {finding.tags.map((tag, idx) => (
                        <React.Fragment key={tag}>
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <span>{tag}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* Expand/Collapse Button for Nodes */}
                  {finding.nodes.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#1E293B]">
                      <button
                        type="button"
                        onClick={() => toggleExpand(finding.id)}
                        className="flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
                        aria-expanded={isExpanded}
                      >
                        <Code className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{isExpanded ? 'Hide Code Snippets & Target Selectors' : `Inspect Affected Elements (${finding.nodes.length})`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded DOM Nodes Details */}
                {isExpanded && finding.nodes.length > 0 && (
                  <div className="bg-[#090D16] border-t border-[#1E293B] p-5 space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      DOM Violations Breakdown:
                    </h4>

                    {finding.nodes.map((node, nodeIdx) => (
                      <div key={nodeIdx} className="bg-[#131B2E] border border-[#1E293B] rounded-lg p-3.5 space-y-2">
                        {/* Selector Target */}
                        {node.target.length > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-slate-400">Target Selector:</span>
                            <code className="text-xs font-mono text-sky-300 bg-[#090D16] px-2 py-0.5 rounded border border-[#1E293B]">
                              {node.target.join(' ')}
                            </code>
                          </div>
                        )}

                        {/* Failure Summary */}
                        {node.failureSummary && (
                          <div className="text-xs text-amber-300/90 leading-relaxed font-sans bg-amber-950/20 border border-amber-900/30 p-2 rounded">
                            {node.failureSummary}
                          </div>
                        )}

                        {/* HTML Snippet */}
                        {node.html && (
                          <div className="relative">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
                              <span>HTML Snippet:</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(node.html, `${finding.id}-${nodeIdx}`)}
                                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === `${finding.id}-${nodeIdx}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" aria-hidden="true" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="text-xs font-mono text-slate-200 bg-[#090D16] p-2.5 rounded border border-[#1E293B] overflow-x-auto">
                              <code>{node.html}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
