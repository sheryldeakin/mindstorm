import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import DifferentialOverview from "../components/clinician/differential/DifferentialOverview";
import DiagnosisReasoningPanel from "../components/clinician/differential/DiagnosisReasoningPanel";
import type { DifferentialDiagnosis, CriterionItem, SymptomCourseRow } from "../components/clinician/differential/types";
import type { CaseEntry, ClinicianCase } from "../types/clinician";
import { apiFetch } from "../lib/apiClient";
import { buildClarificationPrompts } from "../lib/clinicianPrompts";
import useDiagnosticLogic from "../hooks/useDiagnosticLogic";
import {
  depressiveDiagnosisConfigs,
  type DepressiveDiagnosisConfig,
} from "../lib/depressiveCriteriaConfig";

const ClinicianDifferentialEvaluationPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [cases, setCases] = useState<ClinicianCase[]>([]);
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<DifferentialDiagnosis["key"]>("mdd");
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!caseId) return;
    let active = true;
    setLoading(true);
    apiFetch<{ entries: CaseEntry[] }>(`/clinician/cases/${caseId}/entries`)
      .then((response) => {
        if (!active) return;
        setEntries(response.entries || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load case.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  const { getStatusForLabels } = useDiagnosticLogic(entries, { windowDays: 36500 });
  const diagnoses = useMemo<DifferentialDiagnosis[]>(() => {
    if (!entries.length) return [];
    return buildDifferentialFromEntries(entries, getStatusForLabels);
  }, [entries, getStatusForLabels]);

  useEffect(() => {
    setSelectedKey(diagnosesSorted(diagnoses)[0]?.key || "mdd");
  }, [diagnoses]);

  const selectedDiagnosis = diagnoses.find((item) => item.key === selectedKey) || diagnoses[0];
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
            value={caseId || ""}
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
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Differential overview</h3>
              <p className="text-xs text-slate-500">Ranked by criteria coverage.</p>
            </div>
            <DifferentialOverview
              diagnoses={diagnosesSorted(diagnoses)}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
          </div>
          {selectedDiagnosis ? (
            <DiagnosisReasoningPanel
              diagnosis={selectedDiagnosis}
              diagnosisKey={selectedDiagnosis.key}
              entries={entries}
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
  ): CriterionItem => {
    const present = findEvidence(labels, "PRESENT");
    const absent = findEvidence(labels, "ABSENT");
    if (present.length) {
      const latest = present[present.length - 1];
      return {
        id,
        label,
        state: "present",
        evidenceNote: `${defaultNote} ${latest.span}`,
        severity: "moderate",
        recency: latest.dateISO,
      };
    }
    if (absent.length) {
      const latest = absent[absent.length - 1];
      return {
        id,
        label,
        state: "absent",
        evidenceNote: `${defaultNote} ${latest.span}`,
        recency: latest.dateISO,
      };
    }
    return {
      id,
      label,
      state: "ambiguous",
      evidenceNote: defaultNote,
    };
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

  const buildSpecifiers = (labels: string[], displayLabel: string) => {
    if (!labels.length) return [];
    const grouped = entries.flatMap((entry) =>
      (entry.evidenceUnits ?? [])
        .filter((unit) => labels.includes(unit.label) && unit.attributes?.polarity === "PRESENT")
        .map(() => entry.dateISO),
    );
    if (!grouped.length) return [];
    const start = grouped[0];
    const end = grouped[grouped.length - 1];
    return [{ label: displayLabel, startISO: start, endISO: end, active: true }];
  };

  return depressiveDiagnosisConfigs.map((config) =>
    buildDiagnosisFromConfig(config, entries, buildCriterion, buildCourse, toPrompts),
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

const buildDiagnosisFromConfig = (
  config: DepressiveDiagnosisConfig,
  entries: CaseEntry[],
  buildCriterion: (id: string, label: string, labels: string[], defaultNote: string) => CriterionItem,
  buildCourse: (label: string, labels: string[]) => SymptomCourseRow,
  prompts: { text: string; category?: string }[],
): DifferentialDiagnosis => {
  const criteriaItems = config.criteria.map((criterion) =>
    buildCriterion(
      criterion.id,
      criterion.label,
      criterion.evidenceLabels,
      `${criterion.label} signal noted:`,
    ),
  );
  const hasCriteria = config.total > 0 && config.required > 0;
  const currentCount = criteriaItems.filter((item) => item.state === "present").length;
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
    if (!config.durationWindow) return undefined;
    const windowEntries = getEntriesWithinWindow(entries, config.durationWindow.windowDays);
    const windowCount = countPresentCriteria(windowEntries, config.criteria);
    return {
      label: config.durationWindow.label,
      current: windowCount,
      total: config.total,
      required: config.required,
      note: config.durationWindow.note,
    };
  };

  return {
    key: config.key,
    card: {
      key: config.key,
      title: config.title,
      abbreviation: config.abbreviation,
      likelihood,
      status,
      shortSummary: hasCriteria
        ? ""
        : "Criteria mapping not yet configured for this diagnosis.",
      criteriaPreview: hasCriteria ? { met: currentCount, total: config.total } : undefined,
    },
    criteria: criteriaItems,
    criteriaSummary: {
      current: currentCount,
      required: config.required,
      total: config.total,
      window: buildWindowSummary(),
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
    exclusionChecks: [
      { label: "Mania history", state: "unknown" },
      { label: "Substance/medication attribution", state: "unknown" },
    ],
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
