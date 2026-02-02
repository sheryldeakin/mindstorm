import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";

import PageHeader from "../components/layout/PageHeader";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";

import CaseStatusHeader from "../components/clinician/CaseStatusHeader";
import { CaseSynthesisCard } from "../components/clinician/CaseSynthesisCard";
import SignalTranslationFeed from "../components/clinician/SignalTranslationFeed";
import SymptomHeatmap from "../components/clinician/SymptomHeatmap";
import FunctionalImpactCard from "../components/clinician/FunctionalImpactCard";
import DiagnosticLogicGraph from "../components/clinician/DiagnosticLogicGraph";
import ClinicianNotesPanel from "../components/clinician/ClinicianNotesPanel";
import DifferentialOverview from "../components/clinician/differential/DifferentialOverview";
import DiagnosisReasoningPanel from "../components/clinician/differential/DiagnosisReasoningPanel";
import ComorbidityView from "../components/clinician/differential/ComorbidityView";
import ComorbidityWarnings from "../components/clinician/differential/ComorbidityWarnings";

import { ClinicalCaseProvider, useClinicalCase } from "../contexts/ClinicalCaseContext";
import { buildInquiryItems, buildClarificationPrompts } from "../lib/clinicianPrompts";
import { buildCoverageMetrics } from "../lib/clinicianMetrics";
import useDiagnosticLogic from "../hooks/useDiagnosticLogic";
import {
  depressiveDiagnosisConfigs,
  mapNodeToEvidence,
  type DepressiveDiagnosisConfig,
} from "../lib/depressiveCriteriaConfig";
import { DIAGNOSTIC_GRAPH_NODES } from "../lib/diagnosticGraphConfig";
import type {
  CaseEntry,
  EvidenceUnit,
} from "../types/clinician";
import type {
  DifferentialDiagnosis,
  CriterionItem,
  SymptomCourseRow,
  ExclusionCheck,
} from "../components/clinician/differential/types";

const TABS = [
  { id: "snapshot", label: "Case Snapshot" },
  { id: "differential", label: "Differential Evaluation" },
  { id: "logic", label: "Diagnostic Logic" },
  { id: "notes", label: "Notes & Plan" },
  { id: "admin", label: "Admin & History" },
];

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

const buildDensitySeries = (entries: CaseEntry[]) => {
  if (!entries.length) return Array.from({ length: 30 }, () => 0);
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const latest = sorted[sorted.length - 1];
  if (!latest) return Array.from({ length: 30 }, () => 0);
  const latestDate = new Date(`${latest.dateISO}T00:00:00Z`);
  const series = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(latestDate);
    date.setDate(latestDate.getDate() - (29 - index));
    return date.toISOString().slice(0, 10);
  });
  return series.map((dateISO) =>
    entries.filter((entry) => entry.dateISO === dateISO).length,
  );
};

const countNewCritical = (entries: CaseEntry[], lastAccessISO: string | null) => {
  if (!lastAccessISO) return 0;
  const lastAccessDate = new Date(lastAccessISO);
  return entries.filter((entry) => {
    const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
    return entryDate > lastAccessDate && entry.risk_signal?.level === "high";
  }).length;
};

const diagnosesSorted = (diagnoses: DifferentialDiagnosis[]) =>
  [...diagnoses].sort((a, b) => {
    const weight = { High: 3, Moderate: 2, Low: 1 };
    return weight[b.card.likelihood] - weight[a.card.likelihood];
  });

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

  const buildWindowSummary = (
    label: string,
    criteria: CriterionItem[],
    required: number,
    base: number,
    added: number,
    subtracted: number,
  ) => ({
    label,
    current: Math.max(0, base + added - subtracted),
    total: criteria.length,
    required,
    note: `${base} auto + ${added} overrides - ${subtracted} exclusions`,
  });

  const buildCriteriaSummary = (
    criteria: CriterionItem[],
    required: number,
    total: number,
    base: number,
    added: number,
    subtracted: number,
    windowLabel?: string,
  ) => ({
    current: Math.max(0, base + added - subtracted),
    required,
    total,
    base,
    added,
    subtracted,
    window: windowLabel
      ? buildWindowSummary(windowLabel, criteria, required, base, added, subtracted)
      : undefined,
  });

  const buildSymptomCourse = (
    id: string,
    label: string,
    evidenceLabels: string[],
    sourceEntries: CaseEntry[],
  ): SymptomCourseRow => {
    const withDates = sourceEntries.flatMap((entry) =>
      (entry.evidenceUnits ?? []).map((unit) => ({ ...unit, dateISO: entry.dateISO })),
    );
    const byWeek = withDates.reduce<Record<string, EvidenceUnit[]>>((acc, unit) => {
      if (!evidenceLabels.includes(unit.label)) return acc;
      const weekStart = unit.dateISO.slice(0, 10);
      acc[weekStart] = acc[weekStart] || [];
      acc[weekStart].push(unit);
      return acc;
    }, {});
    const buckets = Object.entries(byWeek).map(([weekStartISO, units]) => {
      const levels = units
        .filter((unit) => unit.attributes?.polarity === "PRESENT")
        .map((unit) => unit.attributes?.severity || "mild");
      const level = levels.includes("high")
        ? "high"
        : levels.includes("moderate")
          ? "moderate"
          : levels.length
            ? "mild"
            : "none";
      return { weekStartISO, level };
    });
    const overrideStatus = resolveOverrideStatus(id, evidenceLabels) || null;
    return {
      id,
      label,
      evidenceLabels,
      autoStatus: normalizeStatus(getStatusForLabels(evidenceLabels)),
      overrideStatus,
      buckets,
    };
  };

  const buildExclusions = (
    label: string,
    evidenceLabels: string[],
    note: string,
  ): ExclusionCheck => {
    const overrideStatus = resolveOverrideStatus(label, evidenceLabels);
    const autoStatus = normalizeStatus(getStatusForLabels(evidenceLabels));
    const hasEvidence = findEvidence(evidenceLabels, "PRESENT").length > 0;
    const state = hasEvidence ? "confirmed" : autoStatus === "EXCLUDED" ? "confirmed" : "unknown";
    return {
      id: label,
      label: formatEvidenceLabel(label),
      state,
      note,
      evidenceLabels,
      autoStatus,
      overrideStatus,
    };
  };

  const buildFunctionalImpact = (entries: CaseEntry[]) =>
    IMPACT_DOMAIN_DEFS.map((domain) => {
      const labels = domain.labels;
      const units = entries.flatMap((entry) => entry.evidenceUnits || []);
      const matches = units.filter((unit) =>
        labels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
      );
      const highest = matches.some((unit) => unit.attributes?.severity === "high")
        ? "high"
        : matches.some((unit) => unit.attributes?.severity === "moderate")
          ? "moderate"
          : matches.length
            ? "mild"
            : "none";
      const overrideStatus = resolveOverrideStatus(domain.id, labels) || null;
      return {
        id: domain.id,
        domain: domain.domain,
        level: highest,
        note: matches[0]?.span,
        evidenceLabels: labels,
        autoStatus: normalizeStatus(getStatusForLabels(labels)),
        overrideStatus,
      };
    });

  const buildSpecifier = (id: string, label: string, evidenceLabels: string[]) => {
    const units = findEvidence(evidenceLabels, "PRESENT");
    const timelinePoints = units.flatMap((unit) =>
      typeof unit.dateISO === "string" ? [Number(unit.dateISO.replace(/-/g, ""))] : [],
    );
    const active = units.length > 0;
    return {
      label,
      startISO: typeof units[0]?.dateISO === "string" ? units[0].dateISO : "",
      endISO:
        typeof units[units.length - 1]?.dateISO === "string"
          ? units[units.length - 1].dateISO
          : "",
      active,
      evidenceCount: units.length,
      density: units.length > 5 ? "Dense" : units.length ? "Moderate" : "Sparse",
      timelinePoints,
      spanDays: units.length,
    };
  };

  const buildCriteriaForConfig = (
    config: DepressiveDiagnosisConfig,
    sourceEntries: CaseEntry[],
  ) => {
    const criteria = config.criteria.map((criterion) => {
      const { item } = buildCriterion(
        criterion.id,
        criterion.label,
        criterion.evidenceLabels,
        criterion.note,
        sourceEntries,
        criterion.emptyNote,
      );
      return item;
    });
    return criteria;
  };

  const summaries = depressiveDiagnosisConfigs.map((config) => {
    const criteria = buildCriteriaForConfig(config, entries);
    const present = criteria.filter((criterion) => criterion.state === "present");
    const base = present.length;
    const overridesApplied = criteria.filter((criterion) =>
      criterion.evidenceNote?.includes("Clinician override"),
    ).length;
    const subtracted = criteria.filter((criterion) => criterion.state === "absent").length;
    const summary = buildCriteriaSummary(
      criteria,
      config.required,
      config.total,
      base,
      overridesApplied,
      subtracted,
      config.windowLabel,
    );
    return { config, criteria, summary };
  });

  const built = summaries.map(({ config, criteria, summary }) => {
    const score = summary.current / summary.total;
    const likelihood = score >= 0.75 ? "High" : score >= 0.5 ? "Moderate" : "Low";
    const status = summary.current >= summary.required ? "Sufficient" : "Incomplete";
    const block = config.blockedBy
      ? getStatusForLabels(config.blockedBy.labels) === "MET"
      : false;
    const blocked = Boolean(block);
    const blockedReason = block ? config.blockedBy?.label : undefined;
    const card = {
      key: config.key,
      title: config.title,
      abbreviation: config.abbreviation,
      likelihood,
      status,
      shortSummary: config.summary ?? config.title,
      blocked,
      blockedReason,
      trend: "steady" as const,
      rankingReason: summary.window?.note,
      criteriaPreview: {
        met: summary.current,
        total: summary.total,
      },
    };
    const symptomCourse = (config.symptomCourse ?? []).map((item) =>
      buildSymptomCourse(item.id, item.label, item.evidenceLabels, entries),
    );
    const functionalImpact = buildFunctionalImpact(entries);
    const exclusionSource = config.exclusionChecks ?? config.ruleOuts ?? [];
    const exclusionChecks = exclusionSource.map((exclusion) =>
      buildExclusions(
        exclusion.id,
        exclusion.evidenceLabels,
        "note" in exclusion && typeof exclusion.note === "string"
          ? exclusion.note
          : exclusion.label || "",
      ),
    );
    const prompts = buildClarificationPrompts(entries, getStatusForLabels);
    const specifiers = SPECIFIER_CONFIGS.map((specifier) =>
      buildSpecifier(specifier.id, specifier.label, specifier.evidenceLabels),
    );
    return {
      key: config.key,
      card,
      criteria,
      criteriaSummary: summary,
      symptomCourse,
      functionalImpact,
      exclusionChecks,
      prompts,
      specifiers,
    };
  });

  return built;
};

const ClinicianCaseHubPageContent = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("snapshot");

  const {
    caseId,
    userName,
    entries,
    loading,
    error,
    notes,
    saveNote,
    updateNote,
    deleteNote,
    overrideRecords,
    nodeOverrides,
    saveOverride,
    graphLogic,
    sessionDelta,
  } = useClinicalCase();

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    [entries],
  );
  const latestEntry = sortedEntries[sortedEntries.length - 1];
  const densitySeries = useMemo(() => buildDensitySeries(entries), [entries]);
  const inquiryItems = useMemo(
    () => buildInquiryItems(entries, graphLogic.getStatusForLabels),
    [entries, graphLogic],
  );
  const coverage = useMemo(() => buildCoverageMetrics(entries), [entries]);
  const daysObserved = useMemo(() => {
    if (sortedEntries.length < 2) return 0;
    const first = new Date(`${sortedEntries[0].dateISO}T00:00:00Z`);
    const last = new Date(`${sortedEntries[sortedEntries.length - 1].dateISO}T00:00:00Z`);
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return 0;
    const diffMs = last.getTime() - first.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [sortedEntries]);

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
  const topCandidate = useMemo(() => {
    if (!coverage.length) return null;
    return [...coverage].sort((a, b) => {
      const aScore = a.max ? a.current / a.max : 0;
      const bScore = b.max ? b.current / b.max : 0;
      return bScore - aScore;
    })[0];
  }, [coverage]);
  const flaggedSignals = useMemo(() => {
    return entries
      .flatMap((entry) => (entry.evidenceUnits || []).map((unit) => ({ entry, unit })))
      .filter(({ unit }) => unit.attributes?.uncertainty === "HIGH");
  }, [entries]);
  const flaggedCount = flaggedSignals.length;
  const [showFlagged, setShowFlagged] = useState(false);

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

  const [selectedKey, setSelectedKey] = useState<DifferentialDiagnosis["key"]>("mdd");
  const [pinnedKeys, setPinnedKeys] = useState<DifferentialDiagnosis["key"][]>([]);

  useEffect(() => {
    if (!caseId) return;
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
  }, [caseId]);

  useEffect(() => {
    if (!diagnoses.length) return;
    if (diagnoses.some((item) => item.key === selectedKey)) return;
    setSelectedKey(diagnosesSorted(diagnoses)[0]?.key || "mdd");
  }, [diagnoses, selectedKey]);

  const persistPins = (nextPins: DifferentialDiagnosis["key"][]) => {
    if (!caseId) return;
    window.localStorage.setItem(`clinician:pins:${caseId}`, JSON.stringify(nextPins));
  };

  const selectedDiagnosis = diagnoses.find((item) => item.key === selectedKey) || diagnoses[0];
  const activeDiagnoses =
    pinnedKeys.length > 0
      ? pinnedKeys
      : selectedDiagnosis
        ? [selectedDiagnosis.key]
        : [];

  if (loading) return <div className="p-10 text-center text-slate-400">Loading case...</div>;
  if (error) return <div className="p-10 text-center text-rose-500">{error}</div>;

  const latestSummary = latestEntry?.summary || latestEntry?.body || "Not documented yet.";
  const latestQuote = latestEntry?.body || latestEntry?.summary || "";
  const latestTags = latestEntry
    ? [...(latestEntry.symptoms || []), ...(latestEntry.context_tags || []), ...(latestEntry.denials || [])]
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const riskEvents = entries.filter((entry) => entry.risk_signal?.level === "high");
  const medicalContexts = entries
    .flatMap((entry) => entry.evidenceUnits || [])
    .filter((unit) => unit.label === "CONTEXT_MEDICAL" && unit.attributes?.polarity === "PRESENT");
  const substanceContexts = entries
    .flatMap((entry) => entry.evidenceUnits || [])
    .filter((unit) => unit.label === "CONTEXT_SUBSTANCE" && unit.attributes?.polarity === "PRESENT");
  const recentMedicalNotes = medicalContexts.slice(-3).map((unit) => unit.span);
  const recentSubstanceNotes = substanceContexts.slice(-3).map((unit) => unit.span);
  const recentSessions = [...entries]
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, 5);

  return (
    <div className="page-container space-y-8 pb-20">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="self-start pl-0 text-slate-400 hover:text-slate-600"
          onClick={() => navigate("/clinician")}
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Case List
        </Button>

        <Card className="p-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{userName}</h1>
              <p className="text-sm text-slate-500">
                MRN: {caseId.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <Tabs
              options={TABS}
              activeId={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-auto"
            />
          </div>
        </Card>
      </div>

      {activeTab === "snapshot" && (
        <div className="space-y-10 animate-in fade-in duration-300">
          <section className="space-y-4">
            <Card className="border-slate-200 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Patient Info</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Last update: {latestEntry?.dateISO || "No data"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      Age: —
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      Pronouns: —
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      Location: —
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-500">
                    <p>
                      Diagnoses: <span className="text-slate-600">Formal — • Provisional —</span>
                    </p>
                    <p>
                      Medications: <span className="text-slate-600">Current — • Changes —</span>
                    </p>
                    <p>
                      Therapy stage: <span className="text-slate-600">—</span>
                    </p>
                    <p>
                      Last session:{" "}
                      <span className="text-slate-600">{latestEntry?.dateISO || "—"}</span>
                      {" • "}
                      Unresolved threads: <span className="text-slate-600">—</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                    Risk: {latestEntry?.risk_signal?.level?.toUpperCase() || "NONE"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                    Contact: —
                  </span>
                  <Link
                    to="#"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Safety plan
                  </Link>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                      Suicide risk: {riskEvents.length ? "present" : "none"}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                      Self-harm history: —
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                      Substance relapse: {substanceContexts.length ? "flagged" : "none"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Presenting Concern & Goals
                </h4>
                <p className="mt-3 text-sm text-slate-700">{latestSummary}</p>
                <p className="mt-2 text-xs text-slate-500">Goals: Not documented yet.</p>
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Current Plan Snapshot
                </h4>
                <p className="mt-3 text-sm text-slate-700">
                  Modality and plan details not documented.
                </p>
                <p className="mt-2 text-xs text-slate-500">Next session focus: —</p>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Step 1
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Triage Brief</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <CaseStatusHeader
              name={userName}
              lastEntryDate={latestEntry?.dateISO || "No data"}
              riskSignal={latestEntry?.risk_signal || null}
              densitySeries={densitySeries}
              newCriticalCount={countNewCritical(entries, sessionDelta.lastAccessISO ?? null)}
              unknownGateCount={inquiryItems.length}
            />
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Risk Level
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {latestEntry?.risk_signal?.level?.toUpperCase() || "NONE"}
                </p>
              </Card>
              <Card className="border-slate-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Open Gates
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{inquiryItems.length}</p>
              </Card>
              <Card className="border-slate-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  New Critical
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {countNewCritical(entries, sessionDelta.lastAccessISO ?? null)}
                </p>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Step 2
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Working Hypothesis</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <CaseSynthesisCard entries={entries} coverage={coverage} />
              <div className="space-y-4">
                <Card className="border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                    <HelpCircle size={14} /> Diagnostic Gaps
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex gap-2 text-sm text-amber-900">
                      <span className="text-amber-500">•</span>
                      <span>
                        <strong>Duration Unknown:</strong> MDD requires 14 days; observed window is{" "}
                        {daysObserved ? `${daysObserved} days` : "insufficient entries"}.
                      </span>
                    </li>
                    <li className="flex gap-2 text-sm text-amber-900">
                      <span className="text-amber-500">•</span>
                      <span>
                        <strong>Rule-out Bipolar:</strong>{" "}
                        {manicHistory ? "Mania signals present." : "No mania signals detected."}{" "}
                        <button
                          type="button"
                          className="font-semibold underline hover:text-amber-700"
                        >
                          Add Question?
                        </button>
                      </span>
                    </li>
                  </ul>
                </Card>
                <FunctionalImpactCard entries={entries} />
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Decision workspaces appear after verification to avoid premature anchoring.
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Step 3
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Verify Evidence</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <Card className="border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Evidence Confidence
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {flaggedCount
                          ? `${flaggedCount} low-confidence extractions need review.`
                          : "No low-confidence extractions flagged."}
                      </p>
                    </div>
                    {flaggedCount ? (
                      <button
                        type="button"
                        onClick={() => setShowFlagged((prev) => !prev)}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        {showFlagged
                          ? "Hide flagged items"
                          : `Review flagged items (${flaggedCount})`}
                      </button>
                    ) : null}
                  </div>
                </Card>

                {showFlagged && flaggedCount ? (
                  <SignalTranslationFeed
                    entries={entries}
                    filterUnit={(unit) => unit.attributes?.uncertainty === "HIGH"}
                    title="Flagged Extractions"
                    label="flagged"
                  />
                ) : null}
              </div>
              <Card className="border-slate-200 p-4">
                <h3 className="mb-4 text-sm font-bold text-slate-700">
                  Symptom Density (Last 90 Days)
                </h3>
                <SymptomHeatmap
                  entries={entries}
                  windowDays={90}
                  groupByWeek
                  highlightLabels={[]}
                />
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Step 3b
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Decision Workspaces</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card
                className="cursor-pointer border-indigo-100 p-6 transition hover:border-indigo-300"
                onClick={() => setActiveTab("differential")}
              >
                <h3 className="text-base font-semibold text-slate-900">Differential Evaluation</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Compare multiple diagnoses side-by-side to avoid premature anchoring. Review
                  rule-outs and exclusions before selecting a working diagnosis.
                </p>
                <div className="mt-4 text-sm font-semibold text-indigo-600">
                  Open differential workspace
                </div>
              </Card>
              <Card
                className="cursor-pointer border-emerald-100 p-6 transition hover:border-emerald-300"
                onClick={() => setActiveTab("logic")}
              >
                <h3 className="text-base font-semibold text-slate-900">Diagnostic Logic Graph</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Validate gate logic and resolve missing criteria. Use this view to confirm
                  whether exclusions or duration rules are met.
                </p>
                <div className="mt-4 text-sm font-semibold text-emerald-600">
                  Inspect logic gates
                </div>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Step 4
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Document & Plan</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <Card className="border-slate-200 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Clinical Notes</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {notes.length} notes • {overrideRecords.length} overrides logged
                  </p>
                </div>
                <Button onClick={() => setActiveTab("notes")}>Open Notes Workspace</Button>
              </div>
            </Card>
          </section>
        </div>
      )}

      {activeTab === "differential" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <PageHeader
            eyebrow="Clinician"
            title="Differential Evaluation"
            description="Clinical decision support — criteria coverage, not diagnosis."
          />

          <Card className="mt-4 border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
            Clinical decision support — criteria coverage, not diagnosis.
          </Card>

          {diagnoses.length === 0 ? (
            <Card className="p-6 text-sm text-slate-500">
              No evidence signals yet for this case. Generate entries or rebuild evidence to
              populate criteria coverage.
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Differential overview</h3>
                  <p className="text-xs text-slate-500">Ranked by criteria coverage.</p>
                </div>
                <ComorbidityWarnings
                  selectedDiagnoses={activeDiagnoses}
                  manicHistory={manicHistory}
                />
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
      )}

      {activeTab === "logic" && (
        <div className="animate-in fade-in duration-300">
          <DiagnosticLogicGraph
            entries={entries}
            patientId={caseId}
            nodeOverrides={nodeOverrides}
            rejectedEvidenceKeys={new Set()}
            lastAccessISO={sessionDelta.lastAccessISO}
            onNodeSelect={() => {}}
            onOverrideChange={async (nodeId, status, note) => {
              await saveOverride(nodeId, status, { note });
            }}
          />
        </div>
      )}

      {activeTab === "notes" && (
        <div className="max-w-2xl animate-in fade-in duration-300">
          <ClinicianNotesPanel
            notes={notes}
            onCreate={saveNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
            auditItems={overrideRecords.map((record) => ({
              label: `${record.nodeId} -> ${record.status}`,
              detail: record.note || "",
              dateISO: record.updatedAt || "",
            }))}
          />
        </div>
      )}

      {activeTab === "admin" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-slate-200 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Patient Info</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Last update: {latestEntry?.dateISO || "No data"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
                  Risk: {latestEntry?.risk_signal?.level?.toUpperCase() || "NONE"}
                </span>
                <Link
                  to="#"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Safety plan
                </Link>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-slate-200 p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Presenting Concern & Goals
              </h4>
              <p className="mt-3 text-sm text-slate-700">{latestSummary}</p>
              <p className="mt-2 text-xs text-slate-500">Goals: Not documented yet.</p>
            </Card>

            <Card className="border-slate-200 p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Plan Snapshot
              </h4>
              <p className="mt-3 text-sm text-slate-700">
                Modality and plan details not documented.
              </p>
              <p className="mt-2 text-xs text-slate-500">Next session focus: —</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Safety Plan & Crisis History
                </h4>
                <p className="mt-3 text-sm text-slate-700">
                  {riskEvents.length
                    ? `${riskEvents.length} high-risk signal(s) logged. Review safety context.`
                    : "No high-risk signals logged in recent entries."}
                </p>
                <p className="mt-2 text-xs text-slate-500">Safety plan: Not documented.</p>
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Strengths & Protective Factors
                </h4>
                <p className="mt-3 text-sm text-slate-700">
                  Not documented. Capture strengths or supports in notes.
                </p>
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Medication & Medical Context
                </h4>
                <p className="mt-3 text-sm text-slate-700">
                  {medicalContexts.length
                    ? `${medicalContexts.length} medical context signal(s) captured.`
                    : "No medical context recorded."}
                </p>
                {recentMedicalNotes.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {recentMedicalNotes.map((note, idx) => (
                      <li key={`${note}-${idx}`}>• {note}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">
                  Substance context: {substanceContexts.length || "None"} signal(s).
                </p>
                {recentSubstanceNotes.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {recentSubstanceNotes.map((note, idx) => (
                      <li key={`${note}-${idx}`}>• {note}</li>
                    ))}
                  </ul>
                ) : null}
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Homework & Assignments
                </h4>
                <p className="mt-3 text-sm text-slate-700">No active assignments documented.</p>
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Working Formulation
                </h4>
                <p className="mt-3 text-sm text-slate-700">
                  Predisposing / precipitating / perpetuating factors not documented.
                </p>
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Alerts & Red Flags
                </h4>
                <p className="mt-3 text-sm text-slate-700">
                  {riskEvents.length
                    ? `Risk signals present (${riskEvents.length} high-risk entries).`
                    : "No critical alerts flagged."}
                </p>
                {overrideRecords.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {overrideRecords.length} clinician override(s) logged.
                  </p>
                ) : null}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client Voice Excerpt
                </h4>
                <p className="mt-3 text-sm italic text-slate-600">
                  {latestQuote ? `“${latestQuote.slice(0, 220)}”` : "No recent excerpt."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {latestEntry?.dateISO ? <span>{latestEntry.dateISO}</span> : null}
                  {latestTags.length ? (
                    <>
                      <span className="text-slate-300">•</span>
                      {latestTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </>
                  ) : null}
                </div>
              </Card>

              <Card className="border-slate-200 p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Session Timeline
                </h4>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {recentSessions.length ? (
                    recentSessions.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-3">
                        <span className="text-xs text-slate-400">{entry.dateISO}</span>
                        <Link
                          to={`/clinician/cases/${caseId}/entries/${entry.id}`}
                          className="text-slate-700 hover:text-indigo-600"
                        >
                          {entry.summary || entry.title || "Session entry"}
                        </Link>
                        <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-500">
                          {entry.risk_signal?.level ? (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                              {entry.risk_signal.level}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                            {entry.evidenceUnits?.length || 0} signals
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500">No sessions recorded yet.</li>
                  )}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClinicianCaseHubPage = () => {
  const { userId } = useParams();
  if (!userId) {
    return <Card className="p-6 text-sm text-slate-500">Select a case to begin.</Card>;
  }
  return (
    <ClinicalCaseProvider caseId={userId}>
      <ClinicianCaseHubPageContent />
    </ClinicalCaseProvider>
  );
};

export default ClinicianCaseHubPage;
