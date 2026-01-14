export interface PatternSpanLink {
  id: string;
  label: string;
  dateRange: string;
}

export interface PatternTimelinePoint {
  id: string;
  label: string;
  intensity: number;
  spanIds?: string[];
}

export interface PatternTimelineSeries {
  scaleLabel: string;
  points: PatternTimelinePoint[];
  spanLinks: PatternSpanLink[];
}

export interface LifeAreaImpact {
  id: string;
  label: string;
  detail: string;
  score: number;
}

export type InfluenceDirection = "up" | "down" | "steady";

export interface PatternInfluence {
  id: string;
  label: string;
  detail: string;
  direction: InfluenceDirection;
  confidence: number;
}

export interface CopingStrategies {
  userTagged: string[];
  suggested: string[];
}

export interface PatternDetail {
  id: string;
  title: string;
  summary: string;
  phrases: string[];
  paraphrase: string;
  rangeLabel: string;
  intensityLabel: string;
  timeline: Record<string, PatternTimelineSeries>;
  lifeAreas: LifeAreaImpact[];
  influences: PatternInfluence[];
  copingStrategies: CopingStrategies;
  exploreQuestions: string[];
}
