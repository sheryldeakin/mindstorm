import type { CaseEntry, EvidenceUnit } from "../types/clinician";
import { depressiveDiagnosisConfigs } from "./depressiveCriteriaConfig";

type MddSeverity = "mild" | "moderate" | "severe";
type MddRemission = "none" | "partial" | "full";

const MDD_KEY = "mdd";

const getMddConfig = () => depressiveDiagnosisConfigs.find((config) => config.key === MDD_KEY);

const buildPresenceMap = (units: EvidenceUnit[], configLabels: { id: string; evidenceLabels: string[] }[]) =>
  configLabels.reduce<Record<string, boolean>>((acc, criterion) => {
    const hasSignal = units.some(
      (unit) =>
        criterion.evidenceLabels.includes(unit.label) &&
        unit.attributes?.polarity === "PRESENT",
    );
    acc[criterion.id] = hasSignal;
    return acc;
  }, {});

const countPresence = (presence: Record<string, boolean>) =>
  Object.values(presence).filter(Boolean).length;

const getEntriesWithinDays = (entries: CaseEntry[], windowDays: number) => {
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

const hasPsychosisSignal = (entries: CaseEntry[], windowDays?: number) => {
  const scopedEntries = windowDays ? getEntriesWithinDays(entries, windowDays) : entries;
  return scopedEntries.some((entry) =>
    (entry.evidenceUnits ?? []).some(
      (unit) =>
        unit.label === "SYMPTOM_PSYCHOSIS" && unit.attributes?.polarity === "PRESENT",
    ),
  );
};

const deriveSeverity = (currentCount: number, required: number, total: number): MddSeverity => {
  if (currentCount <= Math.max(required + 1, Math.ceil(total * 0.6))) return "mild";
  if (currentCount <= Math.max(required + 3, Math.ceil(total * 0.8))) return "moderate";
  return "severe";
};

const deriveRemission = (
  entries: CaseEntry[],
  currentCount: number,
  lifetimeCount: number,
  required: number,
): MddRemission => {
  if (lifetimeCount < required) return "none";
  if (currentCount >= required) return "none";
  const last60 = getEntriesWithinDays(entries, 60);
  const hasRecentSignals = last60.some((entry) =>
    (entry.evidenceUnits ?? []).some((unit) => unit.attributes?.polarity === "PRESENT"),
  );
  return hasRecentSignals ? "partial" : "full";
};

const detectRecurrent = (entries: CaseEntry[], configLabels: { id: string; evidenceLabels: string[] }[], required: number) => {
  if (entries.length < 60) return false;
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const windows: { start: Date; end: Date; met: boolean }[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const start = new Date(`${sorted[i].dateISO}T00:00:00Z`);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    const windowEntries = sorted.filter((entry) => {
      const date = new Date(`${entry.dateISO}T00:00:00Z`);
      return date >= start && date <= end;
    });
    const units = windowEntries.flatMap((entry) => entry.evidenceUnits ?? []);
    const presence = buildPresenceMap(units, configLabels);
    windows.push({ start, end, met: countPresence(presence) >= required });
  }
  const metWindows = windows.filter((window) => window.met);
  if (metWindows.length < 2) return false;
  for (let i = 0; i < metWindows.length - 1; i += 1) {
    const gapDays =
      (metWindows[i + 1].start.getTime() - metWindows[i].end.getTime()) /
      (1000 * 60 * 60 * 24);
    if (gapDays >= 60) return true;
  }
  return false;
};

export const getMddIcdPreview = (entries: CaseEntry[]) => {
  const config = getMddConfig();
  if (!config) {
    return {
      code: "F32.9",
      label: "Major Depressive Disorder (unspecified)",
      detail: "Criteria map unavailable.",
    };
  }
  const allUnits = entries.flatMap((entry) => entry.evidenceUnits ?? []);
  const presence = buildPresenceMap(allUnits, config.criteria);
  const lifetimeCount = countPresence(presence);
  const currentEntries = getEntriesWithinDays(entries, 14);
  const currentUnits = currentEntries.flatMap((entry) => entry.evidenceUnits ?? []);
  const currentPresence = buildPresenceMap(currentUnits, config.criteria);
  const currentCount = countPresence(currentPresence);
  const psychotic = hasPsychosisSignal(entries, 14);
  const remission = deriveRemission(entries, currentCount, lifetimeCount, config.required);
  const severity = deriveSeverity(Math.max(currentCount, config.required), config.required, config.total);
  const recurrent = detectRecurrent(entries, config.criteria, config.required);

  const baseCode = recurrent ? "F33" : "F32";
  if (psychotic) {
    return {
      code: `${baseCode}.3`,
      label: `Major Depressive Disorder, ${recurrent ? "Recurrent" : "Single Episode"}, With Psychotic Features`,
      detail: "Psychotic features override severity coding.",
    };
  }
  if (remission === "partial") {
    return {
      code: recurrent ? "F33.41" : "F32.4",
      label: `Major Depressive Disorder, ${recurrent ? "Recurrent" : "Single Episode"}, In Partial Remission`,
      detail: "Remission codes override severity.",
    };
  }
  if (remission === "full") {
    return {
      code: recurrent ? "F33.42" : "F32.5",
      label: `Major Depressive Disorder, ${recurrent ? "Recurrent" : "Single Episode"}, In Full Remission`,
      detail: "Remission codes override severity.",
    };
  }
  const severityCode = severity === "mild" ? ".0" : severity === "moderate" ? ".1" : ".2";
  return {
    code: `${baseCode}${severityCode}`,
    label: `Major Depressive Disorder, ${recurrent ? "Recurrent" : "Single Episode"}, ${severity[0].toUpperCase()}${severity.slice(1)}`,
    detail: `Severity based on ${currentCount}/${config.total} criteria currently met.`,
  };
};
