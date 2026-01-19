import type { CaseEntry, EvidenceUnit } from "../types/clinician";

type CoverageMetric = {
  label: string;
  current: number;
  lifetime: number;
  max: number;
  threshold?: number;
};

const scoreByLabels = (
  units: EvidenceUnit[],
  weights: Record<string, number>,
  overrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">,
) =>
  Object.entries(weights).reduce((sum, [label, weight]) => {
    const override = overrides?.[label];
    if (override === "MET") return sum + weight;
    if (override === "EXCLUDED") return sum;
    const hasSignal = units.some(
      (unit) => unit.label === label && unit.attributes?.polarity === "PRESENT",
    );
    return sum + (hasSignal ? weight : 0);
  }, 0);

export const buildCoverageMetrics = (
  entries: CaseEntry[],
  overrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">,
  rejectedEvidenceKeys?: Set<string>,
) => {
  const buildKey = (dateISO: string, span: string) => `${dateISO}::${span}`;
  const filterUnits = (entry: CaseEntry) =>
    (entry.evidenceUnits || []).filter(
      (unit) => !rejectedEvidenceKeys?.has(buildKey(entry.dateISO, unit.span)),
    );
  const last14Days = entries.slice(-14);
  const allUnits = entries.flatMap((entry) => filterUnits(entry));
  const recentUnits = last14Days.flatMap((entry) => filterUnits(entry));

  const mddWeights = {
    SYMPTOM_MOOD: 2,
    SYMPTOM_SLEEP: 1,
    SYMPTOM_SOMATIC: 3,
    SYMPTOM_COGNITIVE: 2,
    SYMPTOM_RISK: 1,
  };
  const gadWeights = {
    SYMPTOM_ANXIETY: 4,
    SYMPTOM_SLEEP: 1,
    SYMPTOM_COGNITIVE: 1,
  };
  const ptsdWeights = {
    SYMPTOM_TRAUMA: 4,
    SYMPTOM_ANXIETY: 2,
    SYMPTOM_SLEEP: 1,
  };

  const metrics: CoverageMetric[] = [
    {
      label: "MDD Criteria Coverage",
      current: scoreByLabels(recentUnits, mddWeights, overrides),
      lifetime: scoreByLabels(allUnits, mddWeights, overrides),
      max: 9,
      threshold: 5,
    },
    {
      label: "GAD Criteria Coverage",
      current: scoreByLabels(recentUnits, gadWeights, overrides),
      lifetime: scoreByLabels(allUnits, gadWeights, overrides),
      max: 6,
    },
    {
      label: "PTSD Criteria Coverage",
      current: scoreByLabels(recentUnits, ptsdWeights, overrides),
      lifetime: scoreByLabels(allUnits, ptsdWeights, overrides),
      max: 7,
    },
  ];

  return metrics;
};

export const buildEvidenceSummary = (entries: CaseEntry[]) => {
  const units = entries.flatMap((entry) => entry.evidenceUnits || []);
  const counts = units.reduce<Record<string, number>>((acc, unit) => {
    acc[unit.label] = (acc[unit.label] || 0) + 1;
    return acc;
  }, {});
  return counts;
};
