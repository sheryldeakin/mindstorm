import type { CaseEntry, EvidenceUnit } from "../types/clinician";
import { depressiveDiagnosisConfigs } from "./depressiveCriteriaConfig";

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
  options?: { windowDays?: number; nodeOverrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> },
) => {
  const getRecentEntries = (windowDays: number) => {
    if (!entries.length) return [];
    const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const latest = sorted[sorted.length - 1];
    if (!latest) return [];
    const latestDate = new Date(`${latest.dateISO}T00:00:00Z`);
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - windowDays + 1);
    return sorted.filter((entry) => {
      const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
      return entryDate >= cutoff && entryDate <= latestDate;
    });
  };
  const buildKey = (dateISO: string, span: string) => `${dateISO}::${span}`;
  const filterUnits = (entry: CaseEntry) =>
    (entry.evidenceUnits || []).filter(
      (unit) => !rejectedEvidenceKeys?.has(buildKey(entry.dateISO, unit.span)),
    );
  const windowDays = options?.windowDays ?? 14;
  const last14Days = getRecentEntries(windowDays);
  const allUnits = entries.flatMap((entry) => filterUnits(entry));
  const recentUnits = last14Days.flatMap((entry) => filterUnits(entry));
  const mddConfig = depressiveDiagnosisConfigs.find((config) => config.key === "mdd");
  const mddCriteria = mddConfig?.criteria ?? [];

  const buildCriteriaPresence = (units: EvidenceUnit[]) =>
    mddCriteria.reduce<Record<string, boolean>>((acc, criterion) => {
      const hasSignal = units.some(
        (unit) =>
          criterion.evidenceLabels.includes(unit.label) &&
          unit.attributes?.polarity === "PRESENT",
      );
      acc[criterion.id] = hasSignal;
      return acc;
    }, {});

  const buildAdjustedCount = (units: EvidenceUnit[]) => {
    if (!mddCriteria.length) return scoreByLabels(units, mddWeights, overrides);
    const presence = buildCriteriaPresence(units);
    const base = Object.values(presence).filter(Boolean).length;
    const nodeOverrides = options?.nodeOverrides ?? {};
    const added = mddCriteria.filter(
      (criterion) => nodeOverrides[criterion.id] === "MET" && !presence[criterion.id],
    ).length;
    const subtracted = mddCriteria.filter(
      (criterion) => nodeOverrides[criterion.id] === "EXCLUDED" && presence[criterion.id],
    ).length;
    return Math.max(0, base + added - subtracted);
  };

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
      current: buildAdjustedCount(recentUnits),
      lifetime: buildAdjustedCount(allUnits),
      max: mddConfig?.total ?? 9,
      threshold: mddConfig?.required ?? 5,
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
