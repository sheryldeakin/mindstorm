const buildEvidenceKey = (dateISO, span) => `${dateISO}::${span}`;

const CORE_SYMPTOM_LABELS = new Set(["SYMPTOM_MOOD", "SYMPTOM_ANHEDONIA"]);
const COMPUTED_DURATION_2W_LABEL = "DURATION_COMPUTED_2W";
const COMPUTED_DURATION_1M_LABEL = "DURATION_COMPUTED_1_MONTH";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const DEFAULT_RULES_BY_LABEL = {
  SYMPTOM_MANIA: {
    min_confidence: "HIGH",
    attributes_required: { polarity: "PRESENT" },
  },
};

const satisfiesConfidence = (unit, rule) =>
  rule?.min_confidence === "HIGH" ? unit.attributes?.uncertainty !== "HIGH" : true;

const satisfiesAttributes = (unit, required) => {
  if (!required) return true;
  const requiredPolarity = required.polarity;
  if (!requiredPolarity) return true;
  const unitPolarity = unit.attributes?.polarity ?? unit.polarity;
  return unitPolarity === requiredPolarity;
};

const formatShortDate = (dateISO) =>
  new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const truncateMiddle = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  const keep = Math.floor((maxLength - 3) / 2);
  return `${text.slice(0, keep)}...${text.slice(text.length - keep)}`;
};

const entryHasLabel = (entry, label) => {
  if (entry.symptoms?.includes(label)) return true;
  return (entry.evidenceUnits || []).some((unit) => {
    const unitLabel = unit.label || "";
    const unitPolarity = unit.attributes?.polarity ?? unit.polarity;
  return unitLabel === label && unitPolarity === "PRESENT";
  });
};

const findEvidenceSpan = (entry, label) =>
  (entry.evidenceUnits || []).find((unit) => {
    const unitPolarity = unit.attributes?.polarity ?? unit.polarity;
    return unit.label === label && unitPolarity === "PRESENT" && unit.span;
  })?.span;

const entryHasCoreSymptom = (entry) =>
  Array.from(CORE_SYMPTOM_LABELS).some((label) => entryHasLabel(entry, label));

const entryHasMoodSymptom = (entry) => entryHasLabel(entry, "SYMPTOM_MOOD");

const generateComputedEvidence = (entries) => {
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
  const weeksWithSymptom = new Set();
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
    .filter((item) => Boolean(item));
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
  const formatEvidenceItem = (item) => `'${item.text}' (${formatShortDate(item.dateISO)})`;
  const buildEvidenceList = (items) => items.map(formatEvidenceItem).join(", ");
  const buildShortEvidenceList = (items) => {
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

  const computedUnits = [];
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

const appendComputedEvidence = (entries) => {
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
      ? {
          ...entry,
          evidenceUnits: [
            ...(entry.evidenceUnits || []),
            ...computedUnits.map((item) => item.unit),
          ],
        }
      : entry,
  );
};

const appendComputedEvidenceToEntries = (entries) => appendComputedEvidence(entries);

const mapContextTags = (entry, rejectedEvidenceKeys, ruleByLabel) => {
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

const mapSymptoms = (entry, rejectedEvidenceKeys, ruleByLabel) => {
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

const mapDenials = (entry, rejectedEvidenceKeys, ruleByLabel) => {
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

const toJournalEntry = (entry, rejectedEvidenceKeys, ruleByLabel) => ({
  dateISO: entry.dateISO,
  summary: entry.summary || "",
  symptoms: mapSymptoms(entry, rejectedEvidenceKeys, ruleByLabel),
  denials: mapDenials(entry, rejectedEvidenceKeys, ruleByLabel),
  context_tags: mapContextTags(entry, rejectedEvidenceKeys, ruleByLabel),
  risk_signal: entry.risk_signal ?? null,
});

const collectSet = (entries, key) => {
  const set = new Set();
  entries.forEach((entry) => {
    entry[key].forEach((item) => set.add(item));
  });
  return set;
};

const getWindowEntries = (entries, days) => {
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

const getMaxWindowCount = (entries, days) => {
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
  (symptoms, denials, overrides) =>
  (labels) => {
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

const normalizeOverrides = (overrides, overrideList) => {
  if (overrides) return overrides;
  if (!overrideList?.length) return undefined;
  return overrideList.reduce((acc, item) => {
    acc[item.nodeId] = item.status;
    return acc;
  }, {});
};

const evaluateDiagnosticLogic = (entries, options = {}) => {
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

module.exports = {
  evaluateDiagnosticLogic,
  appendComputedEvidenceToEntries,
};
