export type EmotionTone = "positive" | "neutral" | "negative";

export interface Emotion {
  label: string;
  intensity: number;
  tone: EmotionTone;
}

export interface Trigger {
  label: string;
  frequency: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  emotions: Emotion[];
  tags: string[];
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  trend: "up" | "down" | "steady";
}

export interface PatternMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  status: "up" | "down";
}
