import { useMemo } from "react";
import type { CaseEntry, ClinicianOverride, JournalEntry } from "../types/clinician";

export type DiagnosticStatus = "MET" | "EXCLUDED" | "UNKNOWN";

type DiagnosticLogicState = {
  journalEntries: JournalEntry[];
  currentEntries: JournalEntry[];
  lifetimeEntries: JournalEntry[];
  currentSymptoms: Set<string>;
  currentDenials: Set<string>;
  lifetimeSymptoms: Set<string>;
  lifetimeDenials: Set<string>;
  currentCount: number;
  lifetimeWindowMax: number;
  lifetimeCount: number;
  potentialRemission: boolean;
  getStatusForLabels: (labels?: string[]) => DiagnosticStatus;
};

type DiagnosticLogicOptions = {
  windowDays?: number;
  threshold?: number;
  diagnosticWindowDays?: number;
  overrides?: Record<string, DiagnosticStatus>;
  overrideList?: ClinicianOverride[];
  rejectedEvidenceKeys?: Set<string>;
};

const buildEvidenceKey = (dateISO: string, span: string) => `${dateISO}::${span}`;

const mapContextTags = (entry: CaseEntry, rejectedEvidenceKeys?: Set<string>) => {
  if (entry.context_tags?.length) return entry.context_tags;
  const units = entry.evidenceUnits || [];
  return units
    .filter((unit) => unit.label.startsWith("CONTEXT_"))
    .filter((unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span)))
    .map((unit) => unit.label);
};

const mapSymptoms = (entry: CaseEntry, rejectedEvidenceKeys?: Set<string>) => {
  if (entry.symptoms?.length) return entry.symptoms;
  return (entry.evidenceUnits || [])
    .filter((unit) => unit.attributes?.polarity === "PRESENT")
    .filter((unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span)))
    .map((unit) => unit.label);
};

const mapDenials = (entry: CaseEntry, rejectedEvidenceKeys?: Set<string>) => {
  if (entry.denials?.length) return entry.denials;
  return (entry.evidenceUnits || [])
    .filter((unit) => unit.attributes?.polarity === "ABSENT")
    .filter((unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span)))
    .map((unit) => unit.label);
};

const toJournalEntry = (entry: CaseEntry, rejectedEvidenceKeys?: Set<string>): JournalEntry => ({
  dateISO: entry.dateISO,
  summary: entry.summary,
  symptoms: mapSymptoms(entry, rejectedEvidenceKeys),
  denials: mapDenials(entry, rejectedEvidenceKeys),
  context_tags: mapContextTags(entry, rejectedEvidenceKeys),
  risk_signal: entry.risk_signal || null,
});

const collectSet = (entries: JournalEntry[], key: "symptoms" | "denials") => {
  const set = new Set<string>();
  entries.forEach((entry) => {
    entry[key].forEach((item) => set.add(item));
  });
  return set;
};

const getWindowEntries = (entries: JournalEntry[], days: number) => {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const latest = sorted[sorted.length - 1];
  if (!latest) return [];
  const latestDate = new Date(`${latest.dateISO}T00:00:00Z`);
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return sorted.filter((entry) => {
    const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
    return entryDate >= cutoff && entryDate <= latestDate;
  });
};

const getMaxWindowCount = (entries: JournalEntry[], days: number) => {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  let maxCount = 0;
  sorted.forEach((entry) => {
    const endDate = new Date(`${entry.dateISO}T00:00:00Z`);
    const cutoff = new Date(endDate);
    cutoff.setDate(cutoff.getDate() - days + 1);
    const windowEntries = sorted.filter((candidate) => {
      const date = new Date(`${candidate.dateISO}T00:00:00Z`);
      return date >= cutoff && date <= endDate;
    });
    const windowSymptoms = collectSet(windowEntries, "symptoms");
    maxCount = Math.max(maxCount, windowSymptoms.size);
  });
  return maxCount;
};

const buildStatusChecker =
  (symptoms: Set<string>, denials: Set<string>, overrides?: Record<string, DiagnosticStatus>) =>
  (labels?: string[]) => {
    if (!labels?.length) return "UNKNOWN";
    if (overrides) {
      const override = labels
        .map((label) => overrides[label])
        .find((status) => status && status !== "UNKNOWN");
      if (override) return override;
    }
    if (labels.some((label) => symptoms.has(label))) return "MET";
    if (labels.some((label) => denials.has(label))) return "EXCLUDED";
    return "UNKNOWN";
  };

const normalizeOverrides = (
  overrides?: Record<string, DiagnosticStatus>,
  overrideList?: ClinicianOverride[],
) => {
  if (overrides) return overrides;
  if (!overrideList?.length) return undefined;
  return overrideList.reduce<Record<string, DiagnosticStatus>>((acc, item) => {
    acc[item.nodeId] = item.status;
    return acc;
  }, {});
};

const useDiagnosticLogic = (
  entries: CaseEntry[],
  options: DiagnosticLogicOptions = {},
): DiagnosticLogicState => {
  const windowDays = options.windowDays ?? 14;
  const diagnosticWindowDays = options.diagnosticWindowDays ?? 14;
  const threshold = options.threshold ?? 5;
  const overrides = normalizeOverrides(options.overrides, options.overrideList);
  const rejectedEvidenceKeys = options.rejectedEvidenceKeys;

  return useMemo(() => {
    const journalEntries = entries.map((entry) => toJournalEntry(entry, rejectedEvidenceKeys));
    const currentEntries = getWindowEntries(journalEntries, windowDays);
    const lifetimeEntries = journalEntries;

    const currentSymptoms = collectSet(currentEntries, "symptoms");
    const currentDenials = collectSet(currentEntries, "denials");
    const lifetimeSymptoms = collectSet(lifetimeEntries, "symptoms");
    const lifetimeDenials = collectSet(lifetimeEntries, "denials");

    const currentCount = currentSymptoms.size;
    const lifetimeWindowMax = getMaxWindowCount(journalEntries, diagnosticWindowDays);
    const lifetimeCount = lifetimeSymptoms.size;
    const potentialRemission = lifetimeWindowMax >= threshold && currentCount < threshold;

    return {
      journalEntries,
      currentEntries,
      lifetimeEntries,
      currentSymptoms,
      currentDenials,
      lifetimeSymptoms,
      lifetimeDenials,
      currentCount,
      lifetimeWindowMax,
      lifetimeCount,
      potentialRemission,
      getStatusForLabels: buildStatusChecker(currentSymptoms, currentDenials, overrides),
    };
  }, [entries, rejectedEvidenceKeys, windowDays, diagnosticWindowDays, threshold, overrides]);
};

export default useDiagnosticLogic;
