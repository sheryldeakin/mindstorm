export type DiagnosticStatus = "MET" | "EXCLUDED" | "UNKNOWN";

export type DiagnosticEvidenceUnit = {
  span?: string;
  label?: string;
  attributes?: {
    polarity?: "PRESENT" | "ABSENT" | null;
    confidence?: "HIGH" | "LOW" | null;
    frequency?: string | null;
    type?: "computed" | "extracted" | null;
    uncertainty?: "LOW" | "HIGH" | null;
  };
  polarity?: "PRESENT" | "ABSENT" | null;
};

export type DiagnosticCaseEntry = {
  dateISO: string;
  summary?: string;
  symptoms?: string[];
  denials?: string[];
  context_tags?: string[];
  risk_signal?: unknown | null;
  evidenceUnits?: DiagnosticEvidenceUnit[];
};

export type DiagnosticJournalEntry = {
  dateISO: string;
  summary: string;
  symptoms: string[];
  denials: string[];
  context_tags: string[];
  risk_signal?: unknown | null;
};

export type DiagnosticLogicState = {
  journalEntries: DiagnosticJournalEntry[];
  currentEntries: DiagnosticJournalEntry[];
  lifetimeEntries: DiagnosticJournalEntry[];
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

export type DiagnosticLogicOptions = {
  windowDays?: number;
  threshold?: number;
  diagnosticWindowDays?: number;
  overrides?: Record<string, DiagnosticStatus>;
  overrideList?: Array<{ nodeId: string; status: DiagnosticStatus }>;
  rejectedEvidenceKeys?: Set<string>;
  ruleByLabel?: Record<
    string,
    {
      min_confidence?: "HIGH";
      attributes_required?: { polarity?: "PRESENT" | "ABSENT" };
    }
  >;
};

const buildEvidenceKey = (dateISO: string, span: string) => `${dateISO}::${span}`;

const CORE_SYMPTOM_LABELS = new Set(["SYMPTOM_MOOD", "SYMPTOM_ANHEDONIA"]);
const COMPUTED_DURATION_2W_LABEL = "DURATION_COMPUTED_2W";
const COMPUTED_DURATION_1M_LABEL = "DURATION_COMPUTED_1_MONTH";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const DEFAULT_RULES_BY_LABEL: DiagnosticLogicOptions["ruleByLabel"] = {
  SYMPTOM_MANIA: {
    min_confidence: "HIGH",
    attributes_required: { polarity: "PRESENT" },
  },
};

const satisfiesConfidence = (
  unit: DiagnosticEvidenceUnit,
  rule?: { min_confidence?: "HIGH" },
) => (rule?.min_confidence === "HIGH" ? unit.attributes?.uncertainty !== "HIGH" : true);

const satisfiesAttributes = (
  unit: DiagnosticEvidenceUnit,
  required?: { polarity?: "PRESENT" | "ABSENT" },
) => {
  if (!required) return true;
  const requiredPolarity = required.polarity;
  if (!requiredPolarity) return true;
  const unitPolarity = unit.attributes?.polarity ?? unit.polarity;
  return unitPolarity === requiredPolarity;
};

const formatShortDate = (dateISO: string) =>
  new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const truncateMiddle = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  const keep = Math.floor((maxLength - 3) / 2);
  return `${text.slice(0, keep)}...${text.slice(text.length - keep)}`;
};

const entryHasLabel = (entry: DiagnosticCaseEntry, label: string) => {
  if (entry.symptoms?.includes(label)) return true;
  return (entry.evidenceUnits || []).some((unit) => {
    const unitLabel = unit.label || "";
    const unitPolarity = unit.attributes?.polarity ?? unit.polarity;
  return unitLabel === label && unitPolarity === "PRESENT";
  });
};

const findEvidenceSpan = (entry: DiagnosticCaseEntry, label: string) =>
  (entry.evidenceUnits || []).find((unit) => {
    const unitPolarity = unit.attributes?.polarity ?? unit.polarity;
    return unit.label === label && unitPolarity === "PRESENT" && unit.span;
  })?.span;

const entryHasCoreSymptom = (entry: DiagnosticCaseEntry) =>
  Array.from(CORE_SYMPTOM_LABELS).some((label) => entryHasLabel(entry, label));

const entryHasMoodSymptom = (entry: DiagnosticCaseEntry) => entryHasLabel(entry, "SYMPTOM_MOOD");

const generateComputedEvidence = (entries: DiagnosticCaseEntry[]) => {
  if (entries.length < 2) return [];
  const alreadyComputed = entries.some((entry) =>
    (entry.evidenceUnits || []).some(
      (unit) =>
        (unit.label === COMPUTED_DURATION_2W_LABEL ||
          unit.label === COMPUTED_DURATION_1M_LABEL) &&
        unit.attributes?.type === "computed",
    ),
  );
  if (alreadyComputed) return [];
  const coreEntries = entries
    .filter(entryHasCoreSymptom)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (coreEntries.length < 2) return [];
  const startISO = coreEntries[0].dateISO;
  const endISO = coreEntries[coreEntries.length - 1].dateISO;
  const startDate = new Date(`${startISO}T00:00:00Z`);
  const endDate = new Date(`${endISO}T00:00:00Z`);
  const spanDays = Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS);
  if (spanDays < 14) return [];
  const totalWeeks = Math.floor(spanDays / 7) + 1;
  const weeksWithSymptom = new Set<number>();
  coreEntries.forEach((entry) => {
    const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
    const weekIndex = Math.floor((entryDate.getTime() - startDate.getTime()) / WEEK_MS);
    weeksWithSymptom.add(weekIndex);
  });
  const density = totalWeeks > 0 ? weeksWithSymptom.size / totalWeeks : 0;
  if (density < 0.5) return [];

  const targetLabel = coreEntries.some((entry) => entryHasLabel(entry, "SYMPTOM_MOOD"))
    ? "SYMPTOM_MOOD"
    : "SYMPTOM_ANHEDONIA";
  const evidenceItems = coreEntries
    .map((entry) => {
      const span = findEvidenceSpan(entry, targetLabel);
      if (!span) return null;
      return { dateISO: entry.dateISO, text: span };
    })
    .filter((item): item is { dateISO: string; text: string } => Boolean(item));
  if (!evidenceItems.length) return [];

  const sortedEntries = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const latest = sortedEntries[sortedEntries.length - 1];
  if (!latest) return [];
  const latestDate = new Date(`${latest.dateISO}T00:00:00Z`);
  const weekStart = new Date(latestDate);
  weekStart.setDate(weekStart.getDate() - 6);
  const lastWeekEntries = sortedEntries.filter((entry) => {
    const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
    return entryDate >= weekStart && entryDate <= latestDate;
  });
  const frequentMood =
    lastWeekEntries.length >= 4 && lastWeekEntries.every((entry) => entryHasMoodSymptom(entry));

  const durationDays = spanDays;
  const rangeLabel = `${formatShortDate(startISO)} - ${formatShortDate(endISO)}`;
  const formatEvidenceItem = (item: { dateISO: string; text: string }) =>
    `'${item.text}' (${formatShortDate(item.dateISO)})`;
  const buildEvidenceList = (items: { dateISO: string; text: string }[]) =>
    items.map(formatEvidenceItem).join(", ");
  const buildShortEvidenceList = (items: { dateISO: string; text: string }[]) => {
    if (items.length <= 2) return buildEvidenceList(items);
    return `${formatEvidenceItem(items[0])}, ... , ${formatEvidenceItem(items[items.length - 1])}`;
  };

  let evidenceList = buildEvidenceList(evidenceItems);
  let spanText = `Inferred duration: ${durationDays} days (${rangeLabel}). Based on ${evidenceItems.length} signals: ${evidenceList}`;
  if (spanText.length > 500) {
    evidenceList = buildShortEvidenceList(evidenceItems);
    spanText = `Inferred duration: ${durationDays} days (${rangeLabel}). Based on ${evidenceItems.length} signals: ${evidenceList}`;
    if (spanText.length > 500) {
      spanText = truncateMiddle(spanText, 500);
    }
  }

  const computedUnits: Array<{ unit: DiagnosticEvidenceUnit; dateISO: string }> = [];
  if (spanDays >= 14) {
    computedUnits.push({
      unit: {
        label: COMPUTED_DURATION_2W_LABEL,
        span: spanText,
        attributes: {
          polarity: "PRESENT",
          confidence: "HIGH",
          frequency: frequentMood ? "daily" : null,
          type: "computed",
        },
      },
      dateISO: endISO,
    });
  }
  if (spanDays >= 30) {
    computedUnits.push({
      unit: {
        label: COMPUTED_DURATION_1M_LABEL,
        span: spanText,
        attributes: {
          polarity: "PRESENT",
          confidence: "HIGH",
          frequency: frequentMood ? "daily" : null,
          type: "computed",
        },
      },
      dateISO: endISO,
    });
  }
  return computedUnits;
};

const appendComputedEvidence = <T extends DiagnosticCaseEntry>(entries: T[]) => {
  const computedUnits = generateComputedEvidence(entries);
  if (!computedUnits.length) return entries;
  const anchorDateISO = computedUnits[0]?.dateISO;
  if (!anchorDateISO) return entries;
  let latestIndex = -1;
  entries.forEach((entry, index) => {
    if (entry.dateISO === anchorDateISO) latestIndex = index;
  });
  if (latestIndex < 0) return entries;
  return entries.map((entry, index) =>
    index === latestIndex
      ? ({
          ...entry,
          evidenceUnits: [
            ...(entry.evidenceUnits || []),
            ...computedUnits.map((item) => item.unit),
          ],
        } as T)
      : entry,
  );
};

export const appendComputedEvidenceToEntries = <T extends DiagnosticCaseEntry>(entries: T[]) =>
  appendComputedEvidence(entries);

const mapContextTags = (
  entry: DiagnosticCaseEntry,
  rejectedEvidenceKeys?: Set<string>,
  ruleByLabel?: DiagnosticLogicOptions["ruleByLabel"],
) => {
  if (entry.context_tags?.length) return entry.context_tags;
  const units = entry.evidenceUnits || [];
  return units
    .filter((unit) => unit.label?.startsWith("CONTEXT_"))
    .filter((unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span || "")))
    .filter((unit) => {
      const rule = unit.label ? ruleByLabel?.[unit.label] : undefined;
      return satisfiesConfidence(unit, rule) && satisfiesAttributes(unit, rule?.attributes_required);
    })
    .map((unit) => unit.label || "")
    .filter(Boolean);
};

const mapSymptoms = (
  entry: DiagnosticCaseEntry,
  rejectedEvidenceKeys?: Set<string>,
  ruleByLabel?: DiagnosticLogicOptions["ruleByLabel"],
) => {
  if (entry.symptoms?.length) return entry.symptoms;
  return (entry.evidenceUnits || [])
    .filter((unit) => unit.attributes?.polarity === "PRESENT")
    .filter((unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span || "")))
    .filter((unit) => {
      const rule = unit.label ? ruleByLabel?.[unit.label] : undefined;
      return satisfiesConfidence(unit, rule) && satisfiesAttributes(unit, rule?.attributes_required);
    })
    .map((unit) => unit.label || "")
    .filter(Boolean);
};

const mapDenials = (
  entry: DiagnosticCaseEntry,
  rejectedEvidenceKeys?: Set<string>,
  ruleByLabel?: DiagnosticLogicOptions["ruleByLabel"],
) => {
  if (entry.denials?.length) return entry.denials;
  return (entry.evidenceUnits || [])
    .filter((unit) => unit.attributes?.polarity === "ABSENT")
    .filter((unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span || "")))
    .filter((unit) => {
      const rule = unit.label ? ruleByLabel?.[unit.label] : undefined;
      return satisfiesConfidence(unit, rule) && satisfiesAttributes(unit, rule?.attributes_required);
    })
    .map((unit) => unit.label || "")
    .filter(Boolean);
};

const toJournalEntry = (
  entry: DiagnosticCaseEntry,
  rejectedEvidenceKeys?: Set<string>,
  ruleByLabel?: DiagnosticLogicOptions["ruleByLabel"],
): DiagnosticJournalEntry => ({
  dateISO: entry.dateISO,
  summary: entry.summary || "",
  symptoms: mapSymptoms(entry, rejectedEvidenceKeys, ruleByLabel),
  denials: mapDenials(entry, rejectedEvidenceKeys, ruleByLabel),
  context_tags: mapContextTags(entry, rejectedEvidenceKeys, ruleByLabel),
  risk_signal: entry.risk_signal ?? null,
});

const collectSet = (entries: DiagnosticJournalEntry[], key: "symptoms" | "denials") => {
  const set = new Set<string>();
  entries.forEach((entry) => {
    entry[key].forEach((item) => set.add(item));
  });
  return set;
};

const getWindowEntries = (entries: DiagnosticJournalEntry[], days: number) => {
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

const getMaxWindowCount = (entries: DiagnosticJournalEntry[], days: number) => {
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
  (
    symptoms: Set<string>,
    denials: Set<string>,
    overrides?: Record<string, DiagnosticStatus>,
  ) =>
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
  overrideList?: Array<{ nodeId: string; status: DiagnosticStatus }>,
) => {
  if (overrides) return overrides;
  if (!overrideList?.length) return undefined;
  return overrideList.reduce<Record<string, DiagnosticStatus>>((acc, item) => {
    acc[item.nodeId] = item.status;
    return acc;
  }, {});
};

export const evaluateDiagnosticLogic = (
  entries: DiagnosticCaseEntry[],
  options: DiagnosticLogicOptions = {},
): DiagnosticLogicState => {
  const windowDays = options.windowDays ?? 14;
  const diagnosticWindowDays = options.diagnosticWindowDays ?? 14;
  const threshold = options.threshold ?? 5;
  const overrides = normalizeOverrides(options.overrides, options.overrideList);
  const rejectedEvidenceKeys = options.rejectedEvidenceKeys;
  const ruleByLabel = options.ruleByLabel ?? DEFAULT_RULES_BY_LABEL;

  const entriesWithComputed = appendComputedEvidence(entries);
  const journalEntries = entriesWithComputed.map((entry) =>
    toJournalEntry(entry, rejectedEvidenceKeys, ruleByLabel),
  );
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
};
