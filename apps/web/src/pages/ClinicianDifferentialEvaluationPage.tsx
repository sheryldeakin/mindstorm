import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import DifferentialOverview from "../components/clinician/differential/DifferentialOverview";
import DiagnosisReasoningPanel from "../components/clinician/differential/DiagnosisReasoningPanel";
import ComorbidityView from "../components/clinician/differential/ComorbidityView";
import ComorbidityWarnings from "../components/clinician/differential/ComorbidityWarnings";
import type { DifferentialDiagnosis, CriterionItem, SymptomCourseRow, ExclusionCheck } from "../components/clinician/differential/types";
import type { CaseEntry, ClinicianCase } from "../types/clinician";
import { apiFetch } from "../lib/apiClient";
import { buildClarificationPrompts } from "../lib/clinicianPrompts";
import useDiagnosticLogic from "../hooks/useDiagnosticLogic";
import {
  depressiveDiagnosisConfigs,
  mapNodeToEvidence,
  type DepressiveDiagnosisConfig,
} from "../lib/depressiveCriteriaConfig";
import { DIAGNOSTIC_GRAPH_NODES } from "../lib/diagnosticGraphConfig";
import { ClinicalCaseProvider, useClinicalCase } from "../contexts/ClinicalCaseContext";

const EVIDENCE_LABEL_PREFIXES = ["SYMPTOM_", "IMPACT_", "CONTEXT_"];
const DIRECT_EVIDENCE_LABELS = new Set([
  "IMPAIRMENT",
  "DURATION",
  "TEMPORALITY",
  "DURATION_COMPUTED_2W",
  "DURATION_COMPUTED_1_MONTH",
]);

const isEvidenceLabel = (nodeId: string) =>
  EVIDENCE_LABEL_PREFIXES.some((prefix) => nodeId.startsWith(prefix)) ||
  nodeId.startsWith("DURATION_COMPUTED") ||
  DIRECT_EVIDENCE_LABELS.has(nodeId);

const resolveEvidenceLabelsForNode = (nodeId: string) => {
  if (isEvidenceLabel(nodeId)) return [nodeId];
  const baseNode = DIAGNOSTIC_GRAPH_NODES.find((node) => node.id === nodeId);
  if (baseNode?.evidenceLabels?.length) return baseNode.evidenceLabels;
  return mapNodeToEvidence(nodeId);
};

const LABEL_DISPLAY_MAP: Record<string, string> = {
  SYMPTOM_MOOD: "Overall mood signals",
  SYMPTOM_SLEEP: "Overall sleep signals",
  SYMPTOM_ANXIETY: "Anxiety signals",
  SYMPTOM_RISK: "Safety signals",
  SYMPTOM_MANIA: "Mania/hypomania signals",
  SYMPTOM_PSYCHOSIS: "Psychosis signals",
  SYMPTOM_TRAUMA: "Trauma signals",
  SYMPTOM_COGNITIVE: "Cognitive signals",
  SYMPTOM_SOMATIC: "Somatic signals",
  IMPACT_WORK: "Work/School",
  IMPACT_SOCIAL: "Social impact",
  IMPACT_SELF_CARE: "Self-care impact",
  IMPAIRMENT: "Functional impairment",
  CONTEXT_SUBSTANCE: "Substance-related context",
  CONTEXT_MEDICAL: "Medical context",
  CONTEXT_STRESSOR: "Life stressors",
  DURATION: "Duration cues",
  TEMPORALITY: "Timing cues",
  DURATION_COMPUTED_2W: "Computed 2-week duration",
  DURATION_COMPUTED_1_MONTH: "Computed 1-month duration",
};

const formatEvidenceLabel = (label: string) => {
  if (LABEL_DISPLAY_MAP[label]) return LABEL_DISPLAY_MAP[label];
  return label
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const isPromptArtifact = (span: string) => {
  const normalized = span.toLowerCase();
  return (
    normalized.includes("return json") ||
    normalized.includes("json only") ||
    normalized.includes("\"evidence_units\"") ||
    normalized.includes("system prompt") ||
    normalized.includes("you are a")
  );
};

const normalizeStatus = (value: string) =>
  value === "MET" || value === "EXCLUDED" ? value : "UNKNOWN";

const IMPACT_DOMAIN_DEFS = [
  { id: "IMPACT_WORK", domain: "Work/School" as const, labels: ["IMPACT_WORK"] },
  { id: "IMPACT_SOCIAL", domain: "Social" as const, labels: ["IMPACT_SOCIAL"] },
  { id: "IMPACT_SELF_CARE", domain: "Self-care" as const, labels: ["IMPACT_SELF_CARE"] },
  { id: "SYMPTOM_RISK", domain: "Safety" as const, labels: ["SYMPTOM_RISK"] },
];

const SPECIFIER_CONFIGS = [
  { id: "anxious", label: "With anxious distress", evidenceLabels: ["SYMPTOM_ANXIETY"] },
  { id: "melancholic", label: "Melancholic features", evidenceLabels: ["SYMPTOM_MOOD", "SYMPTOM_SOMATIC"] },
  { id: "mixed", label: "Mixed features", evidenceLabels: ["SYMPTOM_MANIA"] },
  { id: "psychotic", label: "Psychotic features", evidenceLabels: ["SYMPTOM_PSYCHOSIS"] },
];

const ClinicianDifferentialEvaluationPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [cases, setCases] = useState<ClinicianCase[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<{ cases: ClinicianCase[] }>("/clinician/cases")
      .then((response) => {
        if (!active) return;
        const list = response.cases || [];
        setCases(list);
        if (!caseId && list.length) {
          navigate(`/clinician/differential-eval/${list[0].userId}`, { replace: true });
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load cases.");
      });
    return () => {
      active = false;
    };
  }, [caseId, navigate]);

  if (!caseId) {
    return (
      <div className="space-y-6 text-slate-900">
        <PageHeader
          eyebrow="Clinician"
          title="Differential Evaluation"
          description="Clinical decision support — criteria coverage, not diagnosis."
        />
        {error ? <Card className="p-6 text-sm text-rose-600">{error}</Card> : null}
        <Card className="p-6 text-sm text-slate-500">Select a case to begin.</Card>
      </div>
    );
  }

  return (
    <ClinicalCaseProvider caseId={caseId}>
      <ClinicianDifferentialEvaluationContent cases={cases} onCaseChange={setError} />
    </ClinicalCaseProvider>
  );
};

const ClinicianDifferentialEvaluationContent = ({
  cases,
  onCaseChange,
}: {
  cases: ClinicianCase[];
  onCaseChange: (message: string | null) => void;
}) => {
  const navigate = useNavigate();
  const {
    caseId,
    entries,
    nodeOverrides,
    loading,
    error,
    sessionDelta,
    saveOverride,
  } = useClinicalCase();
  const [selectedKey, setSelectedKey] = useState<DifferentialDiagnosis["key"]>("mdd");
  const [pinnedKeys, setPinnedKeys] = useState<DifferentialDiagnosis["key"][]>([]);
  const hasHydratedPins = useRef(false);
  const labelOverrides = useMemo(() => {
    const map: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {};
    Object.entries(nodeOverrides).forEach(([nodeId, status]) => {
      const labels = resolveEvidenceLabelsForNode(nodeId);
      labels.forEach((label) => {
        map[label] = status;
      });
    });
    return map;
  }, [nodeOverrides]);

  const autoLogic = useDiagnosticLogic(entries, {
    windowDays: 36500,
    patientId: caseId,
  });
  const manicHistory = autoLogic.getStatusForLabels(["SYMPTOM_MANIA"]) === "MET";

  useEffect(() => {
    onCaseChange(error);
  }, [error, onCaseChange]);

  const diagnoses = useMemo<DifferentialDiagnosis[]>(() => {
    if (!entries.length) return [];
    return buildDifferentialFromEntries(
      entries,
      autoLogic.getStatusForLabels,
      nodeOverrides,
      labelOverrides,
      sessionDelta.lastAccessISO,
    );
  }, [entries, autoLogic, nodeOverrides, labelOverrides, sessionDelta.lastAccessISO]);

  useEffect(() => {
    if (!diagnoses.length) return;
    if (diagnoses.some((item) => item.key === selectedKey)) return;
    setSelectedKey(diagnosesSorted(diagnoses)[0]?.key || "mdd");
  }, [diagnoses, selectedKey]);

  const persistPins = (nextPins: DifferentialDiagnosis["key"][]) => {
    if (!caseId) return;
    window.localStorage.setItem(`clinician:pins:${caseId}`, JSON.stringify(nextPins));
  };

  useEffect(() => {
    if (!caseId) return;
    hasHydratedPins.current = false;
    const stored = window.localStorage.getItem(`clinician:pins:${caseId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPinnedKeys(parsed);
        }
      } catch {
        setPinnedKeys([]);
      }
    } else {
      setPinnedKeys([]);
    }
    hasHydratedPins.current = true;
  }, [caseId]);

  const selectedDiagnosis = diagnoses.find((item) => item.key === selectedKey) || diagnoses[0];
  const activeDiagnoses =
    pinnedKeys.length > 0
      ? pinnedKeys
      : selectedDiagnosis
        ? [selectedDiagnosis.key]
        : [];
  const shortId = caseId ? caseId.slice(0, 6) : "Case";

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        eyebrow="Clinician"
        title={`Differential Evaluation — Case: ${shortId}`}
        description="Clinical decision support — criteria coverage, not diagnosis."
        actions={(
          <select
            className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600"
            value={caseId}
            onChange={(event) => navigate(`/clinician/differential-eval/${event.target.value}`)}
          >
            <option value="">Select case</option>
            {cases.map((item) => (
              <option key={item.userId} value={item.userId}>
                {item.name || item.email || item.userId}
              </option>
            ))}
          </select>
        )}
      />

      <Card className="border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
        Clinical decision support — criteria coverage, not diagnosis.
      </Card>

      {loading ? (
        <Card className="p-6 text-sm text-slate-500">Loading differential evaluation…</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-rose-600">{error}</Card>
      ) : diagnoses.length === 0 ? (
        <Card className="p-6 text-sm text-slate-500">
          No evidence signals yet for this case. Generate entries or rebuild evidence to populate
          criteria coverage.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Differential overview</h3>
              <p className="text-xs text-slate-500">Ranked by criteria coverage.</p>
            </div>
            <ComorbidityWarnings selectedDiagnoses={activeDiagnoses} manicHistory={manicHistory} />
            <DifferentialOverview
              diagnoses={diagnosesSorted(diagnoses)}
              selectedKey={selectedKey}
              pinnedKeys={pinnedKeys}
              onSelect={setSelectedKey}
              onTogglePin={(key) => {
                setPinnedKeys((prev) => {
                  const next = prev.includes(key)
                    ? prev.filter((item) => item !== key)
                    : [...prev, key];
                  persistPins(next);
                  return next;
                });
              }}
            />
            <div className="pt-2">
              <ComorbidityView pinnedKeys={pinnedKeys} />
            </div>
          </div>
          {selectedDiagnosis ? (
            <DiagnosisReasoningPanel
              diagnosis={selectedDiagnosis}
              diagnosisKey={selectedDiagnosis.key}
              entries={entries}
              patientId={caseId}
              nodeOverrides={nodeOverrides}
              labelOverrides={labelOverrides}
              onOverrideChange={async (nodeId, status, note) => {
                const originalLabels = resolveEvidenceLabelsForNode(nodeId);
                const originalStatus = autoLogic.getStatusForLabels(originalLabels);
                await saveOverride(nodeId, status, {
                  originalStatus,
                  originalEvidence: "",
                  note,
                });
              }}
              lastAccessISO={sessionDelta.lastAccessISO}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

const diagnosesSorted = (diagnoses: DifferentialDiagnosis[]) =>
  [...diagnoses].sort((a, b) => {
    const weight = { High: 3, Moderate: 2, Low: 1 };
    return weight[b.card.likelihood] - weight[a.card.likelihood];
  });

export default ClinicianDifferentialEvaluationPage;

const buildDifferentialFromEntries = (
  entries: CaseEntry[],
  getStatusForLabels: (labels?: string[]) => string,
  overrides: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {},
  labelOverrides: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {},
  lastAccessISO?: string | null,
): DifferentialDiagnosis[] => {
  const overrideMap = overrides ?? {};
  const resolveOverrideStatus = (nodeId: string, labels: string[] = []) => {
    const direct = overrideMap[nodeId];
    if (direct) return direct;
    return labels.map((label) => labelOverrides[label]).find((status) => status);
  };
  const unitsWithDate = entries.flatMap((entry) =>
    (entry.evidenceUnits ?? []).map((unit) => ({ ...unit, dateISO: entry.dateISO })),
  );

  const findEvidence = (labels: string[], polarity: "PRESENT" | "ABSENT") =>
    unitsWithDate.filter(
      (unit) =>
        labels.includes(unit.label) &&
        unit.attributes?.polarity === polarity &&
        !isPromptArtifact(unit.span),
    );

  const buildCriterion = (
    id: string,
    label: string,
    labels: string[],
    defaultNote: string,
    sourceEntries: CaseEntry[],
    emptyNote: string,
  ): { item: CriterionItem; evidencePresent: boolean } => {
    const unitsWithDate = sourceEntries.flatMap((entry) =>
      (entry.evidenceUnits ?? []).map((unit) => ({ ...unit, dateISO: entry.dateISO })),
    );
    const overrideStatus = resolveOverrideStatus(id, labels);
    const present = unitsWithDate.filter(
      (unit) =>
        labels.includes(unit.label) &&
        unit.attributes?.polarity === "PRESENT" &&
        !isPromptArtifact(unit.span),
    );
    const absent = unitsWithDate.filter(
      (unit) =>
        labels.includes(unit.label) &&
        unit.attributes?.polarity === "ABSENT" &&
        !isPromptArtifact(unit.span),
    );
    const evidencePresent = present.length > 0;
    if (overrideStatus === "MET" && !evidencePresent) {
      return {
        evidencePresent,
        item: {
          id,
          label,
          state: "present",
          evidenceLabels: labels,
          evidenceNote: `${defaultNote} Clinician override applied.`,
        },
      };
    }
    if (overrideStatus === "EXCLUDED" && !absent.length) {
      return {
        evidencePresent,
        item: {
          id,
          label,
          state: "absent",
          evidenceLabels: labels,
          evidenceNote: `${defaultNote} Clinician override applied.`,
        },
      };
    }
    if (evidencePresent) {
      const latest = present[present.length - 1];
      return {
        evidencePresent,
        item: {
          id,
          label,
          state: "present",
          evidenceLabels: labels,
          evidenceNote: `${defaultNote} ${latest.span}`,
          severity: "moderate",
          recency: latest.dateISO,
        },
      };
    }
    if (absent.length) {
      const latest = absent[absent.length - 1];
      return {
        evidencePresent,
        item: {
          id,
          label,
          state: "absent",
          evidenceLabels: labels,
          evidenceNote: `${defaultNote} ${latest.span}`,
          recency: latest.dateISO,
        },
      };
    }
    return {
      evidencePresent,
      item: {
        id,
        label,
        state: "ambiguous",
        evidenceLabels: labels,
        evidenceNote: emptyNote,
      },
    };
  };

  const buildRuleOut = (node: { id: string; label: string; evidenceLabels: string[] }) => {
    const overrideStatus = overrideMap[node.id] ?? null;
    const present = findEvidence(node.evidenceLabels, "PRESENT");
    const absent = findEvidence(node.evidenceLabels, "ABSENT");
    const autoStatus = normalizeStatus(getStatusForLabels(node.evidenceLabels));

    if (overrideStatus === "MET") {
      return {
        id: node.id,
        label: node.label,
        evidenceLabels: node.evidenceLabels,
        autoStatus,
        overrideStatus,
        state: "confirmed" as const,
        note: "Clinician override applied.",
      };
    }
    if (overrideStatus === "EXCLUDED") {
      return {
        id: node.id,
        label: node.label,
        evidenceLabels: node.evidenceLabels,
        autoStatus,
        overrideStatus,
        state: "notObserved" as const,
        note: "Clinician override applied.",
      };
    }
    if (present.length) {
      return {
        id: node.id,
        label: node.label,
        evidenceLabels: node.evidenceLabels,
        autoStatus,
        overrideStatus,
        state: "confirmed" as const,
        note: present[present.length - 1].span,
      };
    }
    if (absent.length) {
      return {
        id: node.id,
        label: node.label,
        evidenceLabels: node.evidenceLabels,
        autoStatus,
        overrideStatus,
        state: "notObserved" as const,
        note: absent[absent.length - 1].span,
      };
    }
    return {
      id: node.id,
      label: node.label,
      evidenceLabels: node.evidenceLabels,
      autoStatus,
      overrideStatus,
      state: "unknown" as const,
    };
  };

  const buildGateStatus = (nodeId: string) => {
    const overrideStatus = resolveOverrideStatus(nodeId, mapNodeToEvidence(nodeId));
    if (overrideStatus === "MET") {
      return { state: "met" as const, note: "Clinician override applied." };
    }
    if (overrideStatus === "EXCLUDED") {
      return { state: "mismatch" as const, note: "Clinician override applied." };
    }
    const evidenceLabels = mapNodeToEvidence(nodeId);
    const labels = evidenceLabels.length ? evidenceLabels : [nodeId];
    const present = findEvidence(labels, "PRESENT");
    const absent = findEvidence(labels, "ABSENT");
    if (present.length) {
      return { state: "met" as const, note: present[present.length - 1].span };
    }
    if (absent.length) {
      return { state: "mismatch" as const, note: absent[absent.length - 1].span };
    }
    return { state: "unknown" as const, note: "No cycle timing evidence found." };
  };

  const buildCourse = (id: string, label: string, labels: string[]): SymptomCourseRow => {
    const buckets = bucketByWeek(entries, labels);
    const autoStatus = normalizeStatus(getStatusForLabels(labels));
    const overrideStatus = resolveOverrideStatus(id, labels) ?? null;
    return {
      id,
      label,
      evidenceLabels: labels,
      autoStatus,
      overrideStatus,
      buckets,
    };
  };

  const prompts = buildClarificationPrompts(entries, getStatusForLabels);

  const toPrompts = prompts.map((text) => ({
    text,
    category: text.toLowerCase().includes("duration")
      ? "duration"
      : text.toLowerCase().includes("mania")
        ? "criteria"
        : text.toLowerCase().includes("impact")
          ? "impact"
          : text.toLowerCase().includes("substance")
            ? "substance"
            : text.toLowerCase().includes("medical")
              ? "medical"
              : "criteria",
  }));

  return depressiveDiagnosisConfigs.map((config) =>
    buildDiagnosisFromConfig(
      config,
      entries,
      getStatusForLabels,
      buildCriterion,
      buildCourse,
      buildRuleOut,
      buildGateStatus,
      toPrompts,
      overrideMap,
      labelOverrides,
      lastAccessISO,
    ),
  );
};

const bucketByWeek = (entries: CaseEntry[], labels: string[]) => {
  const counts: Record<string, number> = {};
  entries.forEach((entry) => {
    const key = entry.dateISO.slice(0, 7);
    const count = (entry.evidenceUnits ?? []).filter(
      (unit) => labels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
    ).length;
    counts[key] = (counts[key] || 0) + count;
  });
  return Object.entries(counts).map(([weekStartISO, count]) => ({
    weekStartISO: `${weekStartISO}-01`,
    level: count === 0 ? "none" : count === 1 ? "mild" : count === 2 ? "moderate" : "high",
  }));
};

const uniqueLabels = (labels: string[]) => {
  const seen = new Set<string>();
  return labels.filter((label) => {
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
};

const deriveImpactLevel = (
  units: Array<{ attributes?: { severity?: string | null } }> = [],
) => {
  if (!units.length) return "none";
  const severities = units
    .map((unit) => unit.attributes?.severity?.toLowerCase())
    .filter(Boolean) as string[];
  if (severities.some((value) => value.includes("severe") || value.includes("high"))) {
    return "high";
  }
  if (severities.some((value) => value.includes("moderate"))) {
    return "moderate";
  }
  if (severities.some((value) => value.includes("mild") || value.includes("low"))) {
    return "mild";
  }
  const count = units.length;
  return count >= 3 ? "high" : count === 2 ? "moderate" : "mild";
};

const filterPromptsForDiagnosis = (
  diagnosisEvidenceLabels: Set<string>,
  config: DepressiveDiagnosisConfig,
  prompts: { text: string; category?: string }[],
) => {
  const categories = new Set<string>(["criteria"]);
  if (config.requiredDurationDays !== null) categories.add("duration");
  if (
    Array.from(diagnosisEvidenceLabels).some(
      (label) => label === "IMPAIRMENT" || label.startsWith("IMPACT_"),
    )
  ) {
    categories.add("impact");
  }
  if (diagnosisEvidenceLabels.has("CONTEXT_MEDICAL")) categories.add("medical");
  if (diagnosisEvidenceLabels.has("CONTEXT_SUBSTANCE")) categories.add("substance");
  return prompts.filter((prompt) => !prompt.category || categories.has(prompt.category));
};

const SPECIFIER_GAP_THRESHOLD_DAYS = 28;

const getDaysBetween = (startISO: string, endISO: string) => {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};

const getDensityLabel = (count: number, spanDays: number) => {
  if (spanDays <= 14) return count >= 7 ? "Dense" : count >= 3 ? "Moderate" : "Sparse";
  if (spanDays <= 60) return count >= 12 ? "Dense" : count >= 6 ? "Moderate" : "Sparse";
  return count >= 20 ? "Dense" : count >= 10 ? "Moderate" : "Sparse";
};

const buildTimelinePoints = (
  evidenceDates: string[],
  startISO: string,
  endISO: string,
) => {
  if (!startISO || !endISO) return [];
  const spanDays = getDaysBetween(startISO, endISO);
  if (spanDays === 0) return [50];
  const hits = new Set<number>();
  evidenceDates.forEach((dateISO) => {
    const offset = getDaysBetween(startISO, dateISO);
    const pct = Math.min(100, Math.max(0, Math.round((offset / (spanDays + 1)) * 100)));
    hits.add(pct);
  });
  return Array.from(hits).sort((a, b) => a - b);
};

const collectEvidenceDates = (
  entries: CaseEntry[],
  evidenceLabels: string[],
  startISO: string,
  endISO: string,
) =>
  entries
    .filter((entry) => entry.dateISO >= startISO && entry.dateISO <= endISO)
    .filter((entry) =>
      (entry.evidenceUnits || []).some(
        (unit) =>
          evidenceLabels.includes(unit.label) &&
          unit.attributes?.polarity === "PRESENT",
      ),
    )
    .map((entry) => entry.dateISO);

const buildSpecifierRanges = (
  entries: CaseEntry[],
  specifier: { id: string; evidenceLabels: string[] },
) => {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const ranges: Array<{ specifierId: string; start: string; end: string; count: number }> = [];
  let currentRange: { start: string; end: string; count: number } | null = null;

  sorted.forEach((entry, index) => {
    const hasEvidence = (entry.evidenceUnits || []).some(
      (unit) =>
        specifier.evidenceLabels.includes(unit.label) &&
        unit.attributes?.polarity === "PRESENT",
    );
    const isLast = index === sorted.length - 1;
    if (!hasEvidence) {
      if (isLast && currentRange) {
        ranges.push({
          specifierId: specifier.id,
          start: currentRange.start,
          end: currentRange.end,
          count: currentRange.count,
        });
      }
      return;
    }

    if (!currentRange) {
      currentRange = { start: entry.dateISO, end: entry.dateISO, count: 1 };
      if (isLast) {
        ranges.push({
          specifierId: specifier.id,
          start: currentRange.start,
          end: currentRange.end,
          count: currentRange.count,
        });
      }
      return;
    }

    const gapDays = getDaysBetween(currentRange.end, entry.dateISO);
    if (gapDays <= SPECIFIER_GAP_THRESHOLD_DAYS) {
      currentRange.end = entry.dateISO;
      currentRange.count += 1;
    } else {
      ranges.push({
        specifierId: specifier.id,
        start: currentRange.start,
        end: currentRange.end,
        count: currentRange.count,
      });
      currentRange = { start: entry.dateISO, end: entry.dateISO, count: 1 };
    }

    if (isLast && currentRange) {
      ranges.push({
        specifierId: specifier.id,
        start: currentRange.start,
        end: currentRange.end,
        count: currentRange.count,
      });
    }
  });

  return ranges;
};

const buildSpecifiersForDiagnosis = (
  entries: CaseEntry[],
  diagnosisEvidenceLabels: Set<string>,
) => {
  if (!entries.length) return [];
  const relevantSpecifiers = SPECIFIER_CONFIGS.filter((specifier) =>
    specifier.evidenceLabels.some((label) => diagnosisEvidenceLabels.has(label)),
  );
  if (!relevantSpecifiers.length) return [];
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const latestDate = sorted[sorted.length - 1]?.dateISO;
  const currentWindowStart = (() => {
    if (!latestDate) return null;
    const date = new Date(`${latestDate}T00:00:00Z`);
    date.setDate(date.getDate() - 13);
    return date.toISOString().slice(0, 10);
  })();

  const activeSpecifiers = relevantSpecifiers.filter((specifier) =>
    sorted.some((entry) => {
      if (!currentWindowStart) return false;
      return (
        entry.dateISO >= currentWindowStart &&
        (entry.evidenceUnits || []).some(
          (unit) =>
            specifier.evidenceLabels.includes(unit.label) &&
            unit.attributes?.polarity === "PRESENT",
        )
      );
    }),
  );

  const activeTags = activeSpecifiers.map((specifier) => {
    const activeEntries = sorted.filter((entry) => {
      if (!currentWindowStart) return false;
      return (
        entry.dateISO >= currentWindowStart &&
        (entry.evidenceUnits || []).some(
          (unit) =>
            specifier.evidenceLabels.includes(unit.label) &&
            unit.attributes?.polarity === "PRESENT",
        )
      );
    });
    const startISO = activeEntries[0]?.dateISO || latestDate || "";
    const endISO = activeEntries[activeEntries.length - 1]?.dateISO || latestDate || "";
    const spanDays = getDaysBetween(startISO, endISO);
    const evidenceDates = activeEntries.map((entry) => entry.dateISO);
    return {
      label: specifier.label,
      startISO,
      endISO,
      active: true,
      evidenceCount: activeEntries.length,
      density: getDensityLabel(activeEntries.length, spanDays),
      timelinePoints: buildTimelinePoints(evidenceDates, startISO, endISO),
      spanDays,
    };
  });

  const historicalRanges = relevantSpecifiers.flatMap((specifier) =>
    buildSpecifierRanges(sorted, specifier),
  ).filter(
    (range) =>
      !activeSpecifiers.some(
        (current) => current.id === range.specifierId && range.end >= (currentWindowStart || ""),
      ),
  );

  const historicalTags = historicalRanges
    .map((range) => {
      const spec = relevantSpecifiers.find((item) => item.id === range.specifierId);
      const spanDays = getDaysBetween(range.start, range.end);
      const evidenceDates = spec
        ? collectEvidenceDates(sorted, spec.evidenceLabels, range.start, range.end)
        : [];
      return spec
        ? {
            label: spec.label,
            startISO: range.start,
            endISO: range.end,
            active: false,
            evidenceCount: range.count,
            density: getDensityLabel(range.count, spanDays),
            timelinePoints: buildTimelinePoints(evidenceDates, range.start, range.end),
            spanDays,
          }
        : null;
    })
    .filter(
      (
        item,
      ): item is {
        label: string;
        startISO: string;
        endISO: string;
        active: boolean;
        evidenceCount: number;
        density: "Sparse" | "Moderate" | "Dense";
      } => Boolean(item),
    );

  return [...activeTags, ...historicalTags];
};

const getPeakWindowCount = (
  entries: CaseEntry[],
  criteria: { evidenceLabels: string[] }[],
  windowDays: number,
) => {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  let maxCount = 0;
  sorted.forEach((entry) => {
    const endDate = new Date(`${entry.dateISO}T00:00:00Z`);
    const cutoff = new Date(endDate);
    cutoff.setDate(cutoff.getDate() - windowDays + 1);
    const windowEntries = sorted.filter((candidate) => {
      const date = new Date(`${candidate.dateISO}T00:00:00Z`);
      return date >= cutoff && date <= endDate;
    });
    const count = countPresentCriteria(windowEntries, criteria);
    maxCount = Math.max(maxCount, count);
  });
  return maxCount;
};

const getBestWindowEntries = (
  entries: CaseEntry[],
  criteria: { evidenceLabels: string[] }[],
  windowDays: number,
) => {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  let bestEntries: CaseEntry[] = [];
  let bestCount = -1;
  sorted.forEach((entry) => {
    const endDate = new Date(`${entry.dateISO}T00:00:00Z`);
    const cutoff = new Date(endDate);
    cutoff.setDate(cutoff.getDate() - windowDays + 1);
    const windowEntries = sorted.filter((candidate) => {
      const date = new Date(`${candidate.dateISO}T00:00:00Z`);
      return date >= cutoff && date <= endDate;
    });
    const count = countPresentCriteria(windowEntries, criteria);
    if (count > bestCount) {
      bestCount = count;
      bestEntries = windowEntries;
    }
  });
  return bestEntries;
};

const buildDiagnosisFromConfig = (
  config: DepressiveDiagnosisConfig,
  entries: CaseEntry[],
  getStatusForLabels: (labels?: string[]) => string,
  buildCriterion: (
    id: string,
    label: string,
    labels: string[],
    defaultNote: string,
    sourceEntries: CaseEntry[],
    emptyNote: string,
  ) => { item: CriterionItem; evidencePresent: boolean },
  buildCourse: (id: string, label: string, labels: string[]) => SymptomCourseRow,
  buildRuleOut: (node: { id: string; label: string; evidenceLabels: string[] }) => ExclusionCheck,
  buildGateStatus: (nodeId: string) => { state: "met" | "mismatch" | "unknown"; note?: string },
  prompts: { text: string; category?: string }[],
  overrideMap: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {},
  labelOverrides: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {},
  lastAccessISO?: string | null,
): DifferentialDiagnosis => {
  const resolveOverrideStatus = (nodeId: string, labels: string[] = []) => {
    const direct = overrideMap[nodeId];
    if (direct) return direct;
    return labels.map((label) => labelOverrides[label]).find((status) => status);
  };
  const currentWindowDays = 14;
  const currentWindowEntries = getEntriesWithinWindow(entries, currentWindowDays);
  const lifetimeEntries = entries;
  const diagnosticWindowDays = config.requiredDurationDays ?? currentWindowDays;
  const diagnosticWindowEntries =
    config.requiredDurationDays === null
      ? []
      : getBestWindowEntries(entries, config.criteria, diagnosticWindowDays);

  const currentCriteriaWithEvidence = config.criteria.map((criterion) =>
    buildCriterion(
      criterion.id,
      criterion.label,
      criterion.evidenceLabels,
      `${criterion.label} signal noted:`,
      currentWindowEntries,
      "Not observed in the current window.",
    ),
  );
  const diagnosticCriteriaWithEvidence = config.criteria.map((criterion) =>
    buildCriterion(
      criterion.id,
      criterion.label,
      criterion.evidenceLabels,
      `${criterion.label} signal noted:`,
      diagnosticWindowEntries,
      "Not observed in the diagnostic window.",
    ),
  );
  const lifetimeCriteriaWithEvidence = config.criteria.map((criterion) =>
    buildCriterion(
      criterion.id,
      criterion.label,
      criterion.evidenceLabels,
      `${criterion.label} signal noted:`,
      lifetimeEntries,
      "Not observed across recorded entries.",
    ),
  );

  const criteriaItems = currentCriteriaWithEvidence.map((criterion) => criterion.item);
  const hasCriteria = config.total > 0 && config.required > 0;
  const currentMet = config.criteria.reduce<Record<string, boolean>>((acc, criterion) => {
    const hasSignal = currentWindowEntries.some((entry) =>
      (entry.evidenceUnits ?? []).some(
        (unit) =>
          criterion.evidenceLabels.includes(unit.label) &&
          unit.attributes?.polarity === "PRESENT",
      ),
    );
    acc[criterion.id] = hasSignal;
    return acc;
  }, {});
  const baseCount = countPresentCriteria(currentWindowEntries, config.criteria);
  const addedCount = config.criteria.filter(
    (criterion) =>
      resolveOverrideStatus(criterion.id, criterion.evidenceLabels) === "MET" &&
      !currentMet[criterion.id],
  ).length;
  const subtractedCount = config.criteria.filter(
    (criterion) =>
      resolveOverrideStatus(criterion.id, criterion.evidenceLabels) === "EXCLUDED" &&
      currentMet[criterion.id],
  ).length;
  const currentCount = Math.max(0, baseCount + addedCount - subtractedCount);
  const likelihood = hasCriteria
    ? currentCount >= config.required
      ? "High"
      : currentCount >= Math.max(1, Math.ceil(config.required / 2))
        ? "Moderate"
        : "Low"
    : "Low";
  const status = hasCriteria
    ? currentCount >= config.required
      ? "Sufficient"
      : currentCount >= Math.max(1, Math.ceil(config.required / 2))
        ? "Incomplete"
        : "Insufficient"
    : "Insufficient";

  const buildWindowSummary = () => {
    if (config.requiredDurationDays === null) return undefined;
    const windowDays = config.requiredDurationDays ?? currentWindowDays;
    const peakCount = getPeakWindowCount(entries, config.criteria, windowDays);
    return {
      label: config.durationWindow?.label || `Diagnostic window (${windowDays} days)`,
      current: peakCount,
      total: config.total,
      required: config.required,
      note: config.durationWindow?.note || "Peak coverage within required duration.",
    };
  };

  const windowSummary = buildWindowSummary();
  const exclusionChecks = (config.ruleOuts || []).map(buildRuleOut);
  const blocked = exclusionChecks.some((check) => check.state === "confirmed");
  const blockedReason = blocked
    ? exclusionChecks.find((check) => check.state === "confirmed")?.label
    : undefined;

  const rankingReason = blocked
    ? "Rule-out signal detected."
    : windowSummary?.current && windowSummary.current >= config.required
      ? "Duration window met."
      : currentCount >= config.required
        ? "High criteria coverage."
        : currentCount > 0
          ? "Partial evidence signals."
          : "No evidence signals detected.";

  const previousEntries = lastAccessISO
    ? entries.filter((entry) => entry.dateISO < lastAccessISO)
    : [];
  const previousBase = countPresentCriteria(previousEntries, config.criteria);
  const previousAdded = config.criteria.filter(
    (criterion) =>
      resolveOverrideStatus(criterion.id, criterion.evidenceLabels) === "MET" &&
      !previousEntries.some((entry) =>
        (entry.evidenceUnits ?? []).some(
          (unit) =>
            criterion.evidenceLabels.includes(unit.label) &&
            unit.attributes?.polarity === "PRESENT",
        ),
      ),
  ).length;
  const previousSubtracted = config.criteria.filter(
    (criterion) =>
      resolveOverrideStatus(criterion.id, criterion.evidenceLabels) === "EXCLUDED" &&
      previousEntries.some((entry) =>
        (entry.evidenceUnits ?? []).some(
          (unit) =>
            criterion.evidenceLabels.includes(unit.label) &&
            unit.attributes?.polarity === "PRESENT",
        ),
      ),
  ).length;
  const previousCount = Math.max(0, previousBase + previousAdded - previousSubtracted);
  const trend = lastAccessISO
    ? currentCount > previousCount
      ? "up"
      : currentCount < previousCount
        ? "down"
        : "steady"
    : undefined;

  const currentSummary = {
    current: currentCount,
    required: config.required,
    total: config.total,
    base: baseCount,
    added: addedCount,
    subtracted: subtractedCount,
    window: windowSummary,
  };
  const diagnosticSummary = {
    current: windowSummary?.current ?? 0,
    required: config.required,
    total: config.total,
    base: windowSummary?.current ?? 0,
    added: 0,
    subtracted: 0,
    window: windowSummary,
  };
  const lifetimeBase = countPresentCriteria(lifetimeEntries, config.criteria);
  const lifetimeMet = config.criteria.reduce<Record<string, boolean>>((acc, criterion) => {
    const hasSignal = lifetimeEntries.some((entry) =>
      (entry.evidenceUnits ?? []).some(
        (unit) =>
          criterion.evidenceLabels.includes(unit.label) &&
          unit.attributes?.polarity === "PRESENT",
      ),
    );
    acc[criterion.id] = hasSignal;
    return acc;
  }, {});
  const lifetimeAdded = config.criteria.filter(
    (criterion) =>
      resolveOverrideStatus(criterion.id, criterion.evidenceLabels) === "MET" &&
      !lifetimeMet[criterion.id],
  ).length;
  const lifetimeSubtracted = config.criteria.filter(
    (criterion) =>
      resolveOverrideStatus(criterion.id, criterion.evidenceLabels) === "EXCLUDED" &&
      lifetimeMet[criterion.id],
  ).length;
  const lifetimeSummary = {
    current: Math.max(0, lifetimeBase + lifetimeAdded - lifetimeSubtracted),
    required: config.required,
    total: config.total,
    base: lifetimeBase,
    added: lifetimeAdded,
    subtracted: lifetimeSubtracted,
    window: windowSummary,
  };
  const cycleAlignment =
    config.key === "pmdd" ? buildGateStatus("PMDD_D1_TEMPORAL_LUTEAL") : undefined;
  const criteriaLabels = uniqueLabels(
    config.criteria.flatMap((criterion) => criterion.evidenceLabels),
  );
  const ruleOutLabels = uniqueLabels(
    (config.ruleOuts || []).flatMap((ruleOut) => ruleOut.evidenceLabels),
  );
  const impactLabels = uniqueLabels(
    IMPACT_DOMAIN_DEFS.flatMap((impact) => impact.labels),
  );
  const courseLabels = uniqueLabels([
    "SYMPTOM_MOOD",
    "SYMPTOM_SLEEP",
    ...criteriaLabels,
    ...impactLabels,
    ...ruleOutLabels,
  ]);
  const symptomCourse = courseLabels.map((label) =>
    buildCourse(label, formatEvidenceLabel(label), [label]),
  );
  const functionalImpact = IMPACT_DOMAIN_DEFS.map((impact) => {
    const presentUnits = currentWindowEntries.flatMap((entry) =>
      (entry.evidenceUnits ?? []).filter(
        (unit) =>
          impact.labels.includes(unit.label) &&
          unit.attributes?.polarity === "PRESENT" &&
          !isPromptArtifact(unit.span),
      ),
    );
    const overrideStatus = resolveOverrideStatus(impact.id, impact.labels) ?? null;
    const autoStatus = normalizeStatus(getStatusForLabels(impact.labels));
    const level = deriveImpactLevel(presentUnits);
    const note = overrideStatus
      ? "Clinician override applied."
      : presentUnits.length
        ? presentUnits[presentUnits.length - 1].span
        : "No impact evidence in the current window.";
    return {
      id: impact.id,
      domain: impact.domain,
      level,
      note,
      evidenceLabels: impact.labels,
      autoStatus,
      overrideStatus,
    };
  });
  const diagnosisEvidenceLabels = new Set([
    ...criteriaLabels,
    ...ruleOutLabels,
    ...impactLabels,
  ]);
  const filteredPrompts = filterPromptsForDiagnosis(
    diagnosisEvidenceLabels,
    config,
    prompts,
  );
  const specifiers = buildSpecifiersForDiagnosis(entries, diagnosisEvidenceLabels);

  return {
    key: config.key,
    card: {
      key: config.key,
      title: config.title,
      abbreviation: config.abbreviation,
      likelihood,
      status,
      blocked,
      blockedReason,
      trend,
      rankingReason,
      cycleAlignment,
      shortSummary: hasCriteria
        ? ""
        : "Criteria mapping not yet configured for this diagnosis.",
      criteriaPreview: hasCriteria ? { met: currentCount, total: config.total } : undefined,
    },
    criteria: criteriaItems,
    criteriaSummary: currentSummary,
    criteriaSets: {
      current: { label: "Current (14 days)", items: currentCriteriaWithEvidence.map((item) => item.item), summary: currentSummary },
      diagnostic: config.requiredDurationDays === null
        ? undefined
        : { label: config.durationWindow?.label || `Diagnostic (${diagnosticWindowDays} days)`, items: diagnosticCriteriaWithEvidence.map((item) => item.item), summary: diagnosticSummary },
      lifetime: { label: "Lifetime", items: lifetimeCriteriaWithEvidence.map((item) => item.item), summary: lifetimeSummary },
    },
    symptomCourse,
    functionalImpact,
    exclusionChecks,
    prompts: filteredPrompts,
    specifiers,
  };
};

const getEntriesWithinWindow = (entries: CaseEntry[], windowDays: number) => {
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

const countPresentCriteria = (
  entries: CaseEntry[],
  criteria: { evidenceLabels: string[] }[],
) => {
  const units = entries.flatMap((entry) => entry.evidenceUnits ?? []);
  return criteria.reduce((count, criterion) => {
    const hasSignal = units.some(
      (unit) =>
        criterion.evidenceLabels.includes(unit.label) &&
        unit.attributes?.polarity === "PRESENT",
    );
    return count + (hasSignal ? 1 : 0);
  }, 0);
};
