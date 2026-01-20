import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import DifferentialOverview from "../components/clinician/differential/DifferentialOverview";
import DiagnosisReasoningPanel from "../components/clinician/differential/DiagnosisReasoningPanel";
import ComorbidityView from "../components/clinician/differential/ComorbidityView";
import ComorbidityWarnings from "../components/clinician/differential/ComorbidityWarnings";
import type { DifferentialDiagnosis, CriterionItem, SymptomCourseRow } from "../components/clinician/differential/types";
import type { CaseEntry, ClinicianCase } from "../types/clinician";
import { apiFetch } from "../lib/apiClient";
import { buildClarificationPrompts } from "../lib/clinicianPrompts";
import useDiagnosticLogic from "../hooks/useDiagnosticLogic";
import {
  depressiveDiagnosisConfigs,
  mapNodeToEvidence,
  type DepressiveDiagnosisConfig,
} from "../lib/depressiveCriteriaConfig";
import { ClinicalCaseProvider, useClinicalCase } from "../contexts/ClinicalCaseContext";

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
  const baseLogic = useDiagnosticLogic(entries, { windowDays: 36500, overrides: nodeOverrides });
  const manicHistory = baseLogic.getStatusForLabels(["SYMPTOM_MANIA"]) === "MET";

  useEffect(() => {
    onCaseChange(error);
  }, [error, onCaseChange]);

  const diagnoses = useMemo<DifferentialDiagnosis[]>(() => {
    if (!entries.length) return [];
    return buildDifferentialFromEntries(
      entries,
      baseLogic.getStatusForLabels,
      nodeOverrides,
      sessionDelta.lastAccessISO,
    );
  }, [entries, baseLogic, nodeOverrides, sessionDelta.lastAccessISO]);

  useEffect(() => {
    setSelectedKey(diagnosesSorted(diagnoses)[0]?.key || "mdd");
  }, [diagnoses]);

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
              nodeOverrides={nodeOverrides}
              onOverrideChange={async (nodeId, status) => {
                const originalStatus = baseLogic.getStatusForLabels(mapNodeToEvidence(nodeId));
                await saveOverride(nodeId, status, { originalStatus, originalEvidence: "" });
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
  nodeOverrides: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {},
  lastAccessISO?: string | null,
): DifferentialDiagnosis[] => {
  const unitsWithDate = entries.flatMap((entry) =>
    (entry.evidenceUnits ?? []).map((unit) => ({ ...unit, dateISO: entry.dateISO })),
  );

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
    const overrideStatus = nodeOverrides[id];
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
        evidenceNote: emptyNote,
      },
    };
  };

  const buildRuleOut = (node: { id: string; label: string; evidenceLabels: string[] }) => {
    const overrideStatus = nodeOverrides[node.id];
    const present = findEvidence(node.evidenceLabels, "PRESENT");
    const absent = findEvidence(node.evidenceLabels, "ABSENT");

    if (overrideStatus === "MET") {
      return {
        label: node.label,
        state: "confirmed" as const,
        note: "Clinician override applied.",
      };
    }
    if (overrideStatus === "EXCLUDED") {
      return {
        label: node.label,
        state: "notObserved" as const,
        note: "Clinician override applied.",
      };
    }
    if (present.length) {
      return {
        label: node.label,
        state: "confirmed" as const,
        note: present[present.length - 1].span,
      };
    }
    if (absent.length) {
      return {
        label: node.label,
        state: "notObserved" as const,
        note: absent[absent.length - 1].span,
      };
    }
    return { label: node.label, state: "unknown" as const };
  };

  const buildGateStatus = (nodeId: string) => {
    const overrideStatus = nodeOverrides[nodeId];
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

  const buildCourse = (label: string, labels: string[]): SymptomCourseRow => {
    const buckets = bucketByWeek(entries, labels);
    return { label, buckets };
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
      buildCriterion,
      buildCourse,
      buildRuleOut,
      buildGateStatus,
      toPrompts,
      nodeOverrides,
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
  buildCriterion: (
    id: string,
    label: string,
    labels: string[],
    defaultNote: string,
    sourceEntries: CaseEntry[],
    emptyNote: string,
  ) => { item: CriterionItem; evidencePresent: boolean },
  buildCourse: (label: string, labels: string[]) => SymptomCourseRow,
  buildRuleOut: (node: { id: string; label: string; evidenceLabels: string[] }) => {
    label: string;
    state: "confirmed" | "notObserved" | "unknown";
    note?: string;
  },
  buildGateStatus: (nodeId: string) => { state: "met" | "mismatch" | "unknown"; note?: string },
  prompts: { text: string; category?: string }[],
  nodeOverrides: Record<string, "MET" | "EXCLUDED" | "UNKNOWN"> = {},
  lastAccessISO?: string | null,
): DifferentialDiagnosis => {
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
    (criterion) => nodeOverrides[criterion.id] === "MET" && !currentMet[criterion.id],
  ).length;
  const subtractedCount = config.criteria.filter(
    (criterion) => nodeOverrides[criterion.id] === "EXCLUDED" && currentMet[criterion.id],
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
      nodeOverrides[criterion.id] === "MET" &&
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
      nodeOverrides[criterion.id] === "EXCLUDED" &&
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
    (criterion) => nodeOverrides[criterion.id] === "MET" && !lifetimeMet[criterion.id],
  ).length;
  const lifetimeSubtracted = config.criteria.filter(
    (criterion) => nodeOverrides[criterion.id] === "EXCLUDED" && lifetimeMet[criterion.id],
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
    symptomCourse: [
      buildCourse("Mood signals", ["SYMPTOM_MOOD"]),
      buildCourse("Sleep signals", ["SYMPTOM_SLEEP"]),
      buildCourse("Anxiety signals", ["SYMPTOM_ANXIETY"]),
    ],
    functionalImpact: [
      { domain: "Work/School", level: "moderate", note: "Absences noted in recent entries." },
      { domain: "Social", level: "moderate", note: "Social withdrawal observed." },
      { domain: "Self-care", level: "mild", note: "Self-care effort varies." },
      { domain: "Safety", level: "none", note: "No safety incidents noted." },
    ],
    exclusionChecks,
    prompts,
    specifiers: [],
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
