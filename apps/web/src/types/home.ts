export type TrendDirection = "up" | "down" | "steady";

export interface HomePatternCard {
  id: string;
  title: string;
  description: string;
  trend: TrendDirection;
  confidence: "low" | "medium" | "high";
  sparkline: number[];
}

export interface TimeRangeSummary {
  weekOverWeekDelta: string;
  missingSignals: string[];
}
