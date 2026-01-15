import { z } from "zod";

export const RANGE_KEYS = {
  all_time: "all_time",
  last_7_days: "last_7_days",
  last_30_days: "last_30_days",
  last_90_days: "last_90_days",
  last_365_days: "last_365_days",
} as const;

export type RangeKey = keyof typeof RANGE_KEYS | (typeof RANGE_KEYS)[keyof typeof RANGE_KEYS];

export const PolaritySchema = z.enum(["positive", "negative", "neutral"]);
export type Polarity = z.infer<typeof PolaritySchema>;

export const SignalTypeSchema = z.enum([
  "theme",
  "emotion",
  "trigger",
  "influence",
  "life_area",
  "note",
]);
export type SignalType = z.infer<typeof SignalTypeSchema>;

export const LifeAreaSchema = z.enum([
  "work_school",
  "relationships",
  "energy_self_care",
  "motivation",
  "feeling_safe_steady",
  "enjoyment_meaning",
]);
export type LifeArea = z.infer<typeof LifeAreaSchema>;

export const EvidenceUnitSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  signalType: SignalTypeSchema,
  polarity: PolaritySchema.optional(),
  lifeArea: LifeAreaSchema.optional(),
  intensity: z.number().min(0).max(1).optional(),
  timestamp: z.string().optional(),
  sourceId: z.string().optional(),
  quote: z.string().optional(),
});

export type EvidenceUnit = z.infer<typeof EvidenceUnitSchema>;
