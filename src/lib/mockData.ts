import type { Emotion, Insight, JournalEntry, PatternMetric, Trigger } from "../types/journal";

export const sampleEntries: JournalEntry[] = [
  {
    id: "1",
    date: "Mon, 17 Nov",
    title: "Therapy prep - navigating the work storm",
    summary:
      "Energy crashes around 3 PM after intense project stand-ups. Breathing exercises helped ground me before therapy session.",
    tags: ["work", "routine", "therapy"],
    emotions: [
      { label: "Anxiety", intensity: 75, tone: "negative" },
      { label: "Determination", intensity: 62, tone: "positive" },
      { label: "Mental fatigue", intensity: 58, tone: "neutral" },
    ],
  },
  {
    id: "2",
    date: "Sun, 16 Nov",
    title: "Family dinner reflections",
    summary:
      "Dinner was peaceful, but I noticed irritation spike when plans changed. Journaling afterward softened the edge.",
    tags: ["family", "relationships"],
    emotions: [
      { label: "Calm", intensity: 54, tone: "positive" },
      { label: "Irritation", intensity: 40, tone: "negative" },
    ],
  },
  {
    id: "3",
    date: "Sat, 15 Nov",
    title: "Ocean walk reset",
    summary:
      "Morning walk plus cold plunge quieted intrusive thoughts. Felt confident sharing insights during group therapy.",
    tags: ["self-care", "therapy"],
    emotions: [
      { label: "Clarity", intensity: 66, tone: "positive" },
      { label: "Vulnerability", intensity: 48, tone: "neutral" },
    ],
  },
];

export const quickFilters = [
  "All feelings",
  "Anxiety",
  "Wins",
  "Therapy prep",
  "Relationships",
];

export const triggerSuggestions: Trigger[] = [
  { label: "Late-night rumination", frequency: 3 },
  { label: "Slack pings after 8 PM", frequency: 2 },
  { label: "Unplanned schedule shifts", frequency: 4 },
];

export const emotionSuggestions: Emotion[] = [
  { label: "Restless", intensity: 52, tone: "neutral" },
  { label: "Hopeful", intensity: 62, tone: "positive" },
  { label: "Overwhelmed", intensity: 73, tone: "negative" },
];

export const insightCards: Insight[] = [
  {
    id: "insight-1",
    title: "Sunday spike",
    description: "Anxiety trends up 26% on Sunday nights near 8 PM.",
    trend: "up",
  },
  {
    id: "insight-2",
    title: "Rest = Relief",
    description: "7+ hours of sleep correlates with calmer morning entries.",
    trend: "down",
  },
  {
    id: "insight-3",
    title: "Therapy-ready",
    description: "Three concise summaries ready to share this week.",
    trend: "steady",
  },
];

export const patternMetrics: PatternMetric[] = [
  { id: "metric-1", label: "Calm mornings", value: "68%", delta: "+12%", status: "up" },
  { id: "metric-2", label: "Trigger clarity", value: "4 tags", delta: "+2", status: "up" },
  { id: "metric-3", label: "Session readiness", value: "3 briefs", delta: "-1", status: "down" },
];
