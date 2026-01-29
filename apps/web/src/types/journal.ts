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

export type EvidencePolarity = "PRESENT" | "ABSENT";
export type EvidenceUncertainty = "LOW" | "HIGH";

export interface EvidenceAttributes {
  polarity?: EvidencePolarity | null;
  temporality?: string | null;
  frequency?: string | null;
  severity?: string | null;
  attribution?: string | null;
  uncertainty?: EvidenceUncertainty | null;
}

export interface EvidenceUnit {
  span: string;
  label: string;
  attributes?: EvidenceAttributes | null;
}

export interface JournalEntry {
  id: string;
  date: string;
  dateISO?: string;
  title: string;
  summary: string;
  body?: string;
  emotions: Emotion[];
  tags: string[];
  triggers?: string[];
  themes?: string[];
  themeIntensities?: { theme: string; intensity: number }[];
  languageReflection?: string;
  timeReflection?: string;
  evidenceUnits?: EvidenceUnit[];
  createdAt?: string;
  updatedAt?: string;
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
  status: "up" | "down" | "steady";
}
