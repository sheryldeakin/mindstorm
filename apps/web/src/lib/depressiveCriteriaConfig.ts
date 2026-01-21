import criteriaSpec from "@criteria/depressive_disorders.json";

export type EvidenceLabel =
  | "SYMPTOM_MOOD"
  | "SYMPTOM_COGNITIVE"
  | "SYMPTOM_SOMATIC"
  | "SYMPTOM_SLEEP"
  | "SYMPTOM_RISK"
  | "SYMPTOM_ANXIETY"
  | "SYMPTOM_MANIA"
  | "SYMPTOM_PSYCHOSIS"
  | "SYMPTOM_TRAUMA"
  | "DURATION"
  | "TEMPORALITY"
  | "DURATION_COMPUTED_2W"
  | "DURATION_COMPUTED_1_MONTH"
  | "IMPAIRMENT"
  | "CONTEXT_SUBSTANCE"
  | "CONTEXT_MEDICAL"
  | "CONTEXT_STRESSOR";

export type DepressiveDiagnosisKey =
  | "mdd"
  | "pdd"
  | "pmdd"
  | "dmdd"
  | "smidd"
  | "ddamc"
  | "osdd"
  | "udd";

type CriteriaNode = {
  id: string;
  label: string;
  evidenceLabels: EvidenceLabel[];
};

export type DepressiveDiagnosisConfig = {
  key: DepressiveDiagnosisKey;
  title: string;
  abbreviation: string;
  required: number;
  total: number;
  strategy: "k_of_n" | "gate_based";
  criteria: CriteriaNode[];
  ruleOuts: CriteriaNode[];
  requiredDurationDays: number | null;
  durationRuleKind?: string | null;
  durationWindow?: {
    label: string;
    windowDays: number;
    note?: string;
  };
};

type RawDiagnosis = (typeof criteriaSpec)["diagnoses"][number];

const toKey = (id: string): DepressiveDiagnosisKey | null => {
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

export const mapNodeToEvidence = (nodeId: string): EvidenceLabel[] => {
  const id = nodeId.toUpperCase();
  if (id.includes("IMPAIRMENT") || id.includes("DISTRESS")) {
    return ["IMPAIRMENT"];
  }
  if (id.includes("SUBSTANCE") || id.includes("MEDICATION")) {
    return ["CONTEXT_SUBSTANCE"];
  }
  if (id.includes("MEDICAL")) {
    return ["CONTEXT_MEDICAL"];
  }
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
  if (id.includes("ANXIETY") || id.includes("ANXIOUS")) {
    return ["SYMPTOM_ANXIETY"];
  }
  if (id.includes("MANIA") || id.includes("HYPOMANIA")) {
    return ["SYMPTOM_MANIA"];
  }
  if (id.includes("PSYCHOTIC") || id.includes("DELUSION") || id.includes("HALLUC")) {
    return ["SYMPTOM_PSYCHOSIS"];
  }
  if (id.includes("TRAUMA")) {
    return ["SYMPTOM_TRAUMA"];
  }
  if (id.includes("DURATION") || id.includes("TIME") || id.includes("EPISODE")) {
    if (id.includes("PTSD")) {
      return ["DURATION", "TEMPORALITY", "DURATION_COMPUTED_1_MONTH"];
    }
    return ["DURATION", "TEMPORALITY", "DURATION_COMPUTED_2W"];
  }
  return [];
};

const pickDurationWindow = (diagnosis: RawDiagnosis): {
  window?: DepressiveDiagnosisConfig["durationWindow"];
  requiredDurationDays: number | null;
  durationRuleKind?: string | null;
} => {
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

const findCriteriaGroup = (diagnosis: RawDiagnosis) => {
  const threshold = (diagnosis.nodes || []).find(
    (node) => node?.type === "THRESHOLD" && node?.rule?.kind === "k_of_n",
  );
  if (!threshold) return null;
  const groupId = threshold.rule?.group_id;
  if (!groupId) return null;
  const group = (diagnosis.groups || []).find((item) => item.id === groupId);
  if (!group) return null;
  return {
    required: threshold.rule?.k ?? group.member_node_ids?.length ?? 0,
    total: group.member_node_ids?.length ?? 0,
    memberIds: group.member_node_ids ?? [],
  };
};

const requiredTypes = new Set([
  "SYMPTOM",
  "DURATION",
  "IMPAIRMENT",
  "THRESHOLD",
  "CONTEXT",
  "HISTORY",
]);

const buildCriteriaNodes = (diagnosis: RawDiagnosis) => {
  const group = findCriteriaGroup(diagnosis);
  const nodeLookup = new Map(
    (diagnosis.nodes || []).map((node) => [node.id, node]),
  );
  if (group) {
    return group.memberIds.map((memberId) => {
      const node = nodeLookup.get(memberId);
      const label =
        node?.labels?.clinician ||
        node?.labels?.self ||
        node?.description?.clinician ||
        memberId;
      return {
        id: memberId,
        label,
        evidenceLabels: mapNodeToEvidence(memberId),
      };
    });
  }
  return (diagnosis.nodes || [])
    .filter((node) => requiredTypes.has(node.type))
    .map((node) => ({
      id: node.id,
      label:
        node?.labels?.clinician ||
        node?.labels?.self ||
        node?.description?.clinician ||
        node.id,
      evidenceLabels: mapNodeToEvidence(node.id),
    }));
};

const buildRuleOutNodes = (diagnosis: RawDiagnosis) =>
  (diagnosis.nodes || [])
    .filter((node) => node?.type === "RULE_OUT")
    .map((node) => ({
      id: node.id,
      label:
        node?.labels?.clinician ||
        node?.labels?.self ||
        node?.description?.clinician ||
        node.id,
      evidenceLabels: mapNodeToEvidence(node.id),
    }));

export const depressiveDiagnosisConfigs: DepressiveDiagnosisConfig[] = (criteriaSpec.diagnoses || [])
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
    } as DepressiveDiagnosisConfig;
  })
  .filter((item): item is DepressiveDiagnosisConfig => Boolean(item));

export const getDepressiveConfigByKey = (key: DepressiveDiagnosisKey) =>
  depressiveDiagnosisConfigs.find((item) => item.key === key);

export const getDepressiveDiagnosisByKey = (key: DepressiveDiagnosisKey) => {
  const raw = (criteriaSpec.diagnoses || []).find((diagnosis) => toKey(diagnosis.id) === key);
  return raw || null;
};
