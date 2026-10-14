export type ScanStatus = 'pending' | 'navigating' | 'auditing' | 'completed' | 'failed';

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';

export interface FindingNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  impact: ImpactLevel;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodesCount: number;
  nodes: FindingNode[];
}

export interface SummaryCounts {
  violations: number;
  passes: number;
  incomplete: number;
  inapplicable: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface ScanRecord {
  id: string;
  url: string;
  status: ScanStatus;
  statusMessage?: string;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number;
  error?: string | null;
  axeVersion?: string;
  summaryCounts?: SummaryCounts;
  findings?: Finding[];
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  activeScans: number;
  queuedScans: number;
  memoryUsageMb: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  chromiumAvailable: boolean;
  timestamp: string;
}
