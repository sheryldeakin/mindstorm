import { apiFetch } from "./apiClient";

export interface LlmEmotion {
  label: string;
  intensity: number;
  tone: "positive" | "neutral" | "negative";
}

export interface LlmAnalysis {
  title?: string;
  emotions: LlmEmotion[];
  themes?: string[];
  themeIntensities?: { theme: string; intensity: number }[];
  triggers: string[];
  summary?: string;
  languageReflection?: string;
  timeReflection?: string;
}

export const analyzeEntryText = async (text: string): Promise<LlmAnalysis> => {
  const { analysis } = await apiFetch<{ analysis: LlmAnalysis }>("/ai/analyze", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  const legacyTags = (analysis as { tags?: string[] }).tags;

  return {
    title: analysis.title,
    emotions: analysis.emotions || [],
    themes: analysis.themes || legacyTags || [],
    themeIntensities: analysis.themeIntensities || [],
    triggers: analysis.triggers || [],
    summary: analysis.summary,
    languageReflection: analysis.languageReflection,
    timeReflection: analysis.timeReflection,
  };
};
