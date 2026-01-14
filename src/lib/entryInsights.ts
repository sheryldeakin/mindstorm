import type { LlmAnalysis } from "./analyzeEntry";

const STRONG_PHRASES = [
  "exhausted",
  "overwhelmed",
  "can't keep up",
  "burned out",
  "on edge",
  "restless",
  "numb",
  "anxious",
];

const TIME_MARKERS = [
  { key: "couple of weeks", label: "the past couple of weeks" },
  { key: "few weeks", label: "the past few weeks" },
  { key: "weeks", label: "the past few weeks" },
  { key: "week", label: "the past week" },
  { key: "months", label: "the past few months" },
  { key: "month", label: "the past month" },
  { key: "days", label: "the past few days" },
  { key: "day", label: "the past day" },
];

export const buildOverallEmotions = (analysis?: LlmAnalysis | null) =>
  (analysis?.emotions || []).map((emotion) => ({
    label: emotion.label,
    intensity: emotion.intensity,
    tone: emotion.tone,
  }));

export const buildThemes = (analysis?: LlmAnalysis | null) => analysis?.themes || [];

export const buildTouchesOn = (analysis?: LlmAnalysis | null) => {
  const set = new Set<string>();
  analysis?.themes?.forEach((theme) => set.add(theme));
  analysis?.triggers?.forEach((trigger) => set.add(trigger));
  analysis?.emotions?.forEach((emotion) => {
    if (emotion.label) set.add(emotion.label);
  });
  return Array.from(set);
};

export const buildLanguageReflection = (text: string) => {
  if (!text) return "";
  const lower = text.toLowerCase();
  const matches = STRONG_PHRASES.filter((phrase) => lower.includes(phrase));
  if (!matches.length) return "";
  return `You're using strong words like ${matches.map((value) => `"${value}"`).join(", ")}.`;
};

export const buildTimeReflection = (text: string) => {
  if (!text) return "";
  const lower = text.toLowerCase();
  const match = TIME_MARKERS.find((marker) => lower.includes(marker.key));
  if (!match) return "";
  return `You mentioned this has been happening for ${match.label}.`;
};

export const buildQuestions = (themes: string[]) => {
  if (themes.length) {
    return [
      `Does anything make ${themes[0]} feel lighter?`,
      "Is this something you've felt before?",
    ];
  }
  return ["Does anything make this feel lighter?", "Is this something you've felt before?"];
};

export const buildPatternHints = (themes: string[]) => {
  if (!themes.length) {
    return ["Patterns may show up around mood shifts, energy dips, or stress load."];
  }
  return themes.slice(0, 3).map((theme) => `You may see patterns around ${theme}.`);
};

export const buildWhatHelped = (text: string) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const helpers = [
    { key: "walk", label: "Short walk" },
    { key: "breath", label: "Breath reset" },
    { key: "stretch", label: "Stretch break" },
    { key: "sleep", label: "Sleep routine" },
    { key: "sunlight", label: "Sunlight break" },
  ];
  return helpers.filter((item) => lower.includes(item.key)).map((item) => item.label);
};
