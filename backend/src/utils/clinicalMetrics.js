const criteriaSpec = require("../../../packages/criteria-graph/criteria_specs/v1/depressive_disorders.json");

/**
 * Maps diagnosis ID to internal key string.
 * @param {string} id
 * @returns {string | null}
 */
const toKey = (id) => {
  switch (id) {
    case "MDD":
      return "mdd";
    case "PDD":
      return "pdd";
    case "PMDD":
      return "pmdd";
    case "DMDD":
      return "dmdd";
    case "SMIDD":
      return "smidd";
    case "DDAMC":
      return "ddamc";
    case "OSDD":
      return "osdd";
    case "UDD":
      return "udd";
    default:
      return null;
  }
};

/**
 * Maps diagnostic node IDs to evidence labels.
 * @param {string} nodeId
 * @returns {string[]}
 */
const mapNodeToEvidence = (nodeId) => {
  const id = nodeId.toUpperCase();
  if (id.includes("IMPAIRMENT") || id.includes("DISTRESS")) return ["IMPAIRMENT"];
  if (id.includes("SUBSTANCE") || id.includes("MEDICATION")) return ["CONTEXT_SUBSTANCE"];
  if (id.includes("MEDICAL")) return ["CONTEXT_MEDICAL"];
  if (id.includes("SUICID")) return ["SYMPTOM_RISK"];
  if (id.includes("SLEEP") || id.includes("INSOMN") || id.includes("HYPERSOM")) {
    return ["SYMPTOM_SLEEP"];
  }
  if (
    id.includes("ANHEDON") ||
    id.includes("DEPRESSED_MOOD") ||
    id.includes("IRRIT") ||
    id.includes("OUTBURST") ||
    id.includes("TEMPER") ||
    id.includes("ANGRY")
  ) {
    return ["SYMPTOM_MOOD"];
  }
  if (
    id.includes("WORTHLESS") ||
    id.includes("GUILT") ||
    id.includes("CONCENTRATION") ||
    id.includes("INDECISION") ||
    id.includes("HOPELESS")
  ) {
    return ["SYMPTOM_COGNITIVE"];
  }
  if (
    id.includes("APPETITE") ||
    id.includes("WEIGHT") ||
    id.includes("FATIGUE") ||
    id.includes("ENERGY") ||
    id.includes("PSYCHOMOTOR") ||
    id.includes("PHYSICAL")
  ) {
    return ["SYMPTOM_SOMATIC"];
  }
  if (id.includes("ANXIETY") || id.includes("ANXIOUS")) return ["SYMPTOM_ANXIETY"];
  if (id.includes("MANIA") || id.includes("HYPOMANIA")) return ["SYMPTOM_MANIA"];
  if (id.includes("PSYCHOTIC") || id.includes("DELUSION") || id.includes("HALLUC")) {
    return ["SYMPTOM_PSYCHOSIS"];
  }
  if (id.includes("TRAUMA")) return ["SYMPTOM_TRAUMA"];
  return [];
};

/**
 * Determines the duration gate window for a diagnosis config.
 * @param {Record<string, unknown>} diagnosis
 * @returns {{ window?: { label: string, windowDays: number, note?: string }, requiredDurationDays: number | null, durationRuleKind: string | null }}
 */
const pickDurationWindow = (diagnosis) => {
  const durationNode = (diagnosis.nodes || []).find((node) => {
    const kind = node?.rule?.kind;
    return typeof kind === "string" && kind.includes("duration");
  });
  if (!durationNode) {
    return {
      window: undefined,
      requiredDurationDays: 14,
      durationRuleKind: null,
    };
  }
  const rule = durationNode.rule || {};
  const durationRuleKind = typeof rule.kind === "string" ? rule.kind : null;
  if (rule.min_days) {
    const label = rule.min_days === 14 ? "2-week window" : `${rule.min_days}-day window`;
    return {
      window: {
        label,
        windowDays: rule.min_days,
        note: durationNode.labels?.clinician,
      },
      requiredDurationDays: rule.min_days,
      durationRuleKind,
    };
  }
  if (rule.default_months) {
    const windowDays = Math.round(rule.default_months * 30.4);
    return {
      window: {
        label: `${rule.default_months / 12} year window`,
        windowDays,
        note: durationNode.labels?.clinician,
      },
      requiredDurationDays: windowDays,
      durationRuleKind,
    };
  }
  if (durationRuleKind === "cycle_alignment") {
    return {
      window: undefined,
      requiredDurationDays: null,
      durationRuleKind,
    };
  }
  return {
    window: undefined,
    requiredDurationDays: 14,
    durationRuleKind,
  };
};

/**
 * Locates the criteria group for a diagnosis threshold node.
 * @param {Record<string, unknown>} diagnosis
 * @returns {{ group: Record<string, unknown>, required: number | null, total: number | null } | null}
 */
const findCriteriaGroup = (diagnosis) => {
  const threshold = (diagnosis.nodes || []).find(
    (node) => node?.type === "THRESHOLD" && node?.rule?.kind === "k_of_n",
  );
  if (!threshold) return null;
  const groupId = threshold.rule?.group_id;
  if (!groupId) return null;
  const group = (diagnosis.groups || []).find((item) => item.id === groupId);
  if (!group) return null;
  return {
    group,
    required: threshold.rule?.required ?? null,
    total: group.member_node_ids?.length ?? null,
  };
};

/**
 * Builds a list of symptom criteria nodes from diagnosis spec.
 * @param {Record<string, unknown>} diagnosis
 * @returns {Array<{ id: string, label: string, evidenceLabels: string[] }>}
 */
const buildCriteriaNodes = (diagnosis) =>
  (diagnosis.nodes || [])
    .filter((node) => node?.type === "SYMPTOM")
    .map((node) => ({
      id: node.id,
      label:
        node?.labels?.clinician || node?.labels?.self || node?.description?.clinician || node.id,
      evidenceLabels: mapNodeToEvidence(node.id),
    }));

/**
 * Builds a list of rule-out nodes from diagnosis spec.
 * @param {Record<string, unknown>} diagnosis
 * @returns {Array<{ id: string, label: string, evidenceLabels: string[] }>}
 */
const buildRuleOutNodes = (diagnosis) =>
  (diagnosis.nodes || [])
    .filter((node) => node?.type === "RULE_OUT")
    .map((node) => ({
      id: node.id,
      label:
        node?.labels?.clinician || node?.labels?.self || node?.description?.clinician || node.id,
      evidenceLabels: mapNodeToEvidence(node.id),
    }));

const depressiveDiagnosisConfigs = (criteriaSpec.diagnoses || [])
  .map((diagnosis) => {
    const key = toKey(diagnosis.id);
    if (!key) return null;
    const criteriaGroup = findCriteriaGroup(diagnosis);
    const criteria = buildCriteriaNodes(diagnosis);
    const ruleOuts = buildRuleOutNodes(diagnosis);
    const durationConfig = pickDurationWindow(diagnosis);
    return {
      key,
      title: diagnosis.title?.clinician || diagnosis.id,
      abbreviation: diagnosis.id,
      required: criteriaGroup?.required ?? criteria.length,
      total: criteriaGroup?.total ?? criteria.length,
      strategy: criteriaGroup ? "k_of_n" : "gate_based",
      criteria,
      ruleOuts,
      requiredDurationDays: durationConfig.requiredDurationDays,
      durationRuleKind: durationConfig.durationRuleKind,
      durationWindow: durationConfig.window,
    };
  })
  .filter(Boolean);

/**
 * Builds a unique key for evidence span per date.
 * @param {string} dateISO
 * @param {string} span
 * @returns {string}
 */
const buildEvidenceKey = (dateISO, span) => `${dateISO}::${span}`;

/**
 * Filters entries to the most recent window.
 * @param {Array<{ dateISO: string }>} entries
 * @param {number} windowDays
 * @returns {Array<{ dateISO: string }>}
 */
const getRecentEntries = (entries, windowDays) => {
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

/**
 * Scores evidence units by weighted label presence.
 * @param {Array<{ label: string, attributes?: { polarity?: string } }>} units
 * @param {Record<string, number>} weights
 * @param {Record<string, "MET" | "EXCLUDED">} [overrides]
 * @returns {number}
 */
const scoreByLabels = (units, weights, overrides) =>
  Object.entries(weights).reduce((sum, [label, weight]) => {
    const override = overrides?.[label];
    if (override === "MET") return sum + weight;
    if (override === "EXCLUDED") return sum;
    const hasSignal = units.some(
      (unit) => unit.label === label && unit.attributes?.polarity === "PRESENT",
    );
    return sum + (hasSignal ? weight : 0);
  }, 0);

/**
 * Builds criteria coverage metrics using evidence units and optional overrides.
 * @param {Array<{ dateISO: string, evidenceUnits?: Array<{ label: string, span: string, attributes?: Record<string, unknown> }> }>} entries
 * @param {Record<string, "MET" | "EXCLUDED">} [overrides]
 * @param {Set<string>} [rejectedEvidenceKeys]
 * @param {{ windowDays?: number, nodeOverrides?: Record<string, "MET" | "EXCLUDED"> }} [options]
 * @returns {Array<{ label: string, current: number, lifetime: number, max: number, threshold?: number }>}
 */
const buildCoverageMetrics = (entries, overrides, rejectedEvidenceKeys, options) => {
  const filterUnits = (entry) =>
    (entry.evidenceUnits || []).filter(
      (unit) => !rejectedEvidenceKeys?.has(buildEvidenceKey(entry.dateISO, unit.span)),
    );
  const windowDays = options?.windowDays ?? 14;
  const lastWindow = getRecentEntries(entries, windowDays);
  const allUnits = entries.flatMap((entry) => filterUnits(entry));
  const recentUnits = lastWindow.flatMap((entry) => filterUnits(entry));
  const mddConfig = depressiveDiagnosisConfigs.find((config) => config.key === "mdd");
  const mddCriteria = mddConfig?.criteria ?? [];

  const buildCriteriaPresence = (units) =>
    mddCriteria.reduce((acc, criterion) => {
      const hasSignal = units.some(
        (unit) =>
          criterion.evidenceLabels.includes(unit.label) &&
          unit.attributes?.polarity === "PRESENT",
      );
      acc[criterion.id] = hasSignal;
      return acc;
    }, {});

  const buildAdjustedCount = (units) => {
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

  return [
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
};

/**
 * Summarizes evidence unit counts by label.
 * @param {Array<{ evidenceUnits?: Array<{ label: string }> }>} entries
 * @returns {Record<string, number>}
 */
const buildEvidenceSummary = (entries) => {
  const units = entries.flatMap((entry) => entry.evidenceUnits || []);
  return units.reduce((acc, unit) => {
    acc[unit.label] = (acc[unit.label] || 0) + 1;
    return acc;
  }, {});
};

/**
 * Counts distinct evidence unit spans with PRESENT polarity.
 * @param {Array<{ dateISO: string, evidenceUnits?: Array<{ label: string, span: string, attributes?: { polarity?: string } }> }>} entries
 * @returns {number}
 */
const buildSignalDensity = (entries) => {
  const distinct = new Set();
  entries.forEach((entry) => {
    (entry.evidenceUnits || []).forEach((unit) => {
      if (unit.attributes?.polarity !== "PRESENT") return;
      const key = `${entry.dateISO}::${unit.label}::${unit.span}`;
      distinct.add(key);
    });
  });
  return distinct.size;
};

/**
 * Collects high-confidence evidence units for clinician review.
 * @param {Array<{ dateISO: string, evidenceUnits?: Array<{ label: string, span: string, attributes?: { polarity?: string, uncertainty?: string } }> }>} entries
 * @param {number} [limit=20]
 * @returns {Array<{ dateISO: string, label: string, span: string, attributes: Record<string, unknown> }>}
 */
const buildHighConfidenceEvidence = (entries, limit = 20) => {
  const items = [];
  const seen = new Set();
  entries.forEach((entry) => {
    (entry.evidenceUnits || []).forEach((unit) => {
      if (unit.attributes?.polarity !== "PRESENT") return;
      if (unit.attributes?.uncertainty && unit.attributes.uncertainty !== "LOW") return;
      const key = `${entry.dateISO}::${unit.label}::${unit.span}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({
        dateISO: entry.dateISO,
        label: unit.label,
        span: unit.span,
        attributes: unit.attributes || {},
      });
    });
  });
  return items.sort((a, b) => a.dateISO.localeCompare(b.dateISO)).slice(0, limit);
};

/**
 * Determines missing duration and impairment gates.
 * @param {Array<{ dateISO: string, evidenceUnits?: Array<{ label: string, attributes?: { polarity?: string } }> }>} entries
 * @param {number} [windowDays=14]
 * @returns {{ duration: boolean, impairment: boolean, missing: string[] }}
 */
const buildMissingGates = (entries, windowDays = 14) => {
  const currentEntries = getRecentEntries(entries, windowDays);
  if (!currentEntries.length) {
    return { duration: true, impairment: true, missing: ["duration", "impairment"] };
  }
  const sorted = [...currentEntries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const start = new Date(`${sorted[0].dateISO}T00:00:00Z`);
  const end = new Date(`${sorted[sorted.length - 1].dateISO}T00:00:00Z`);
  const spanDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const durationMissing = spanDays < windowDays;
  const hasImpairment = currentEntries.some((entry) =>
    (entry.evidenceUnits || []).some((unit) => {
      if (unit.attributes?.polarity !== "PRESENT") return false;
      return unit.label === "IMPAIRMENT" || unit.label.startsWith("IMPACT_");
    }),
  );
  const impairmentMissing = !hasImpairment;
  const missing = [];
  if (durationMissing) missing.push("duration");
  if (impairmentMissing) missing.push("impairment");
  return { duration: durationMissing, impairment: impairmentMissing, missing };
};

/**
 * Generates clinician-facing appendix metrics from entries.
 * @param {Array<{ dateISO: string, evidenceUnits?: Array<{ label: string, span: string, attributes?: Record<string, unknown> }> }>} entries
 * @returns {{
 *   coverage: Array<{ label: string, current: number, lifetime: number, max: number, threshold?: number }>,
 *   signalDensity: number,
 *   missingGates: { duration: boolean, impairment: boolean, missing: string[] },
 *   highConfidenceEvidence: Array<{ dateISO: string, label: string, span: string, attributes: Record<string, unknown> }>
 * }}
 */
const generateClinicianAppendix = (entries) => {
  const coverage = buildCoverageMetrics(entries);
  return {
    coverage,
    signalDensity: buildSignalDensity(entries),
    missingGates: buildMissingGates(entries),
    highConfidenceEvidence: buildHighConfidenceEvidence(entries),
  };
};

module.exports = {
  buildCoverageMetrics,
  buildEvidenceSummary,
  generateClinicianAppendix,
};
