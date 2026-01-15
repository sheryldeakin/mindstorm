export type TrendDirection = "up" | "down" | "steady";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface ThemeSeriesPoint {
  dateISO: string;
  intensity: number;
  confidence?: number;
}

export interface ThemeSeries {
  userId: string;
  rangeKey: string;
  theme: string;
  points: ThemeSeriesPoint[];
  computedAt?: string;
  pipelineVersion?: string;
  sourceVersion?: string;
  stale?: boolean;
}

export interface ConnectionsGraphEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
  evidenceEntryIds?: string[];
}

export interface ConnectionsGraphNode {
  id: string;
  label: string;
}

export interface ConnectionsGraph {
  userId: string;
  rangeKey: string;
  nodes: ConnectionsGraphNode[];
  edges: ConnectionsGraphEdge[];
  computedAt?: string;
  pipelineVersion?: string;
  sourceVersion?: string;
  stale?: boolean;
}

export interface SnapshotPattern {
  id: string;
  title: string;
  description: string;
  trend: TrendDirection;
  confidence: ConfidenceLevel;
  sparkline: number[];
}

export interface SnapshotSummary {
  rangeKey: string;
  entryCount?: number;
  snapshotOverview: string;
  patterns: SnapshotPattern[];
  impactAreas: string[];
  influences: string[];
  openQuestions: string[];
  timeRangeSummary: {
    weekOverWeekDelta: string;
    missingSignals: string[];
  };
  whatHelped: string[];
  prompts: string[];
}
