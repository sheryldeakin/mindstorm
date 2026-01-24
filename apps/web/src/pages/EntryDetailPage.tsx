import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { EvidenceUnit } from "../types/journal";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import useEntry from "../hooks/useEntry";
import useDeleteEntry from "../hooks/useDeleteEntry";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import patientView from "@criteria/depressive_disorders_patient_view.json";
import { buildContextImpactTags } from "../lib/patientSignals";
import LiveInsightPanel from "../components/features/LiveInsightPanel";
import ConfirmDeleteEntryModal from "../components/features/ConfirmDeleteEntryModal";
import { apiFetch } from "../lib/apiClient";

type ConditionRule = {
  label?: string;
  label_in?: string[];
  attributes_required?: Record<string, string>;
  attributes_missing?: string[];
};

type DerivedPrompt = {
  id: string;
  condition: ConditionRule;
  prompt: string;
};

type QuestionBank = {
  missing_duration?: string;
  missing_impact?: string;
  uncertainty?: string;
  attribution?: string;
};

type PatientViewMapping = {
  derived_prompts?: {
    unclear_areas?: DerivedPrompt[];
    questions_to_explore?: DerivedPrompt[];
    question_bank?: QuestionBank;
  };
};

const shouldExcludeLabel = (label: string) => label.startsWith("DX_") || label.startsWith("THRESHOLD");

const isMissing = (value: unknown) => value === null || value === undefined || value === "";

const matchesCondition = (unit: EvidenceUnit, condition: ConditionRule) => {
  if (condition.label && unit.label !== condition.label) return false;
  if (condition.label_in && !condition.label_in.includes(unit.label)) return false;

  const attributes = unit.attributes || {};
  if (condition.attributes_required) {
    for (const [key, expected] of Object.entries(condition.attributes_required)) {
      const actual = attributes?.[key as keyof typeof attributes];
      if (actual !== expected) return false;
    }
  }

  if (condition.attributes_missing) {
    for (const key of condition.attributes_missing) {
      const actual = attributes?.[key as keyof typeof attributes];
      if (!isMissing(actual)) return false;
    }
  }

  return true;
};

const buildDerivedPrompts = (units: EvidenceUnit[], rules: DerivedPrompt[] = []) => {
  const prompts = new Map<string, string>();
  rules.forEach((rule) => {
    const matches = units.some((unit) => matchesCondition(unit, rule.condition));
    if (matches) prompts.set(rule.id, rule.prompt);
  });
  return Array.from(prompts.values());
};

const DEFAULT_QUESTION_BANK: QuestionBank = {
  missing_impact:
    "Does this feeling mostly stay in the background, or does it interfere with things you need to do (like work or connecting with people)?",
  missing_duration: "Does this feel like a new wave, or has it been settling in for a while?",
  attribution: "Have there been any recent shifts in your sleep, health, or routine that might be playing a role?",
  uncertainty:
    "If you had to describe the physical sensation of that feeling, what would it be?",
};

/**
 * Builds patient-friendly questions from missing/uncertain evidence.
 * @param {EvidenceUnit[]} units
 * @param {QuestionBank | undefined} questionBank
 * @returns {string[]}
 */
const buildGeneratedQuestions = (units: EvidenceUnit[], questionBank: QuestionBank | undefined) => {
  const questions = new Set<string>();
  const resolvedBank = { ...DEFAULT_QUESTION_BANK, ...(questionBank || {}) };
  const usedSpans = new Set<string>();

  const formatSpan = (span: string) => {
    const trimmed = span.trim();
    if (trimmed.length <= 60) return trimmed;
    return `${trimmed.slice(0, 57).trim()}...`;
  };

  const getSpan = (filterFn: (unit: EvidenceUnit) => boolean) => {
    const candidates = units.filter(
      (unit) =>
        unit.attributes?.polarity === "PRESENT" &&
        unit.span &&
        unit.span.trim().length >= 5 &&
        unit.span.trim().length <= 60 &&
        !usedSpans.has(unit.span.trim()) &&
        filterFn(unit),
    );
    if (!candidates.length) return null;

    const severityScore = (unit: EvidenceUnit) => {
      const severity = unit.attributes?.severity?.toUpperCase() || "";
      if (severity.includes("SEVERE") || severity.includes("HIGH")) return 3;
      if (severity.includes("MODERATE")) return 2;
      return 1;
    };

    const isCoreSymptom = (unit: EvidenceUnit) =>
      ["SYMPTOM_MOOD", "SYMPTOM_ANHEDONIA", "SYMPTOM_ANXIETY"].includes(unit.label);

    const sorted = candidates.slice().sort((a, b) => {
      const severityDiff = severityScore(b) - severityScore(a);
      if (severityDiff !== 0) return severityDiff;
      const coreDiff = Number(isCoreSymptom(b)) - Number(isCoreSymptom(a));
      if (coreDiff !== 0) return coreDiff;
      return a.span!.trim().length - b.span!.trim().length;
    });

    const best = sorted[0];
    if (!best?.span) return null;
    const rawSpan = best.span.trim();
    usedSpans.add(rawSpan);
    return formatSpan(rawSpan);
  };

  const hasDuration = units.some(
    (unit) =>
      unit.attributes?.temporality ||
      unit.label === "DURATION" ||
      unit.label === "TEMPORALITY",
  );
  const hasImpact = units.some((unit) => unit.label?.startsWith("IMPACT_") || unit.label === "IMPACT");
  const hasUncertainty = units.some((unit) => unit.attributes?.uncertainty === "HIGH");
  const hasContext = units.some((unit) => unit.label?.startsWith("CONTEXT_"));
  const hasSymptoms = units.some((unit) => unit.label?.startsWith("SYMPTOM_"));
  const totalQuestionNeeds = Number(!hasImpact) + Number(!hasDuration) + Number(!hasContext) + Number(hasUncertainty);
  const availableSpanCount = new Set(
    units
      .filter(
        (unit) =>
          unit.attributes?.polarity === "PRESENT" &&
          unit.span &&
          unit.span.trim().length >= 5 &&
          unit.span.trim().length <= 60,
      )
      .map((unit) => unit.span!.trim()),
  ).size;

  if (availableSpanCount === 1 && totalQuestionNeeds > 1) {
    const span = units.find(
      (unit) =>
        unit.attributes?.polarity === "PRESENT" &&
        unit.span &&
        unit.span.trim().length >= 5 &&
        unit.span.trim().length <= 60,
    )?.span;
    if (span) {
      const clipped = formatSpan(span);
      const grouped: string[] = [];
      if (!hasImpact && resolvedBank.missing_impact) grouped.push(resolvedBank.missing_impact);
      if (!hasDuration && resolvedBank.missing_duration) grouped.push(resolvedBank.missing_duration);
      if (!hasContext && resolvedBank.attribution) grouped.push(resolvedBank.attribution);
      if (hasUncertainty && resolvedBank.uncertainty) grouped.push(resolvedBank.uncertainty);
      if (grouped.length) {
        const bullets = grouped.join("\n");
        questions.add(`Reflecting on "${clipped}":\n${bullets}`);
        return Array.from(questions);
      }
    }
  }

  if (!hasImpact && hasSymptoms && resolvedBank.missing_impact) {
    const span = getSpan((unit) => unit.label?.startsWith("SYMPTOM_"));
    if (span) {
      questions.add(`You mentioned "${span}". ${resolvedBank.missing_impact}`);
    } else {
      questions.add(resolvedBank.missing_impact);
    }
  }
  if (!hasDuration && hasSymptoms && resolvedBank.missing_duration) {
    const span = getSpan((unit) => unit.label?.startsWith("SYMPTOM_"));
    if (span) {
      questions.add(`Regarding "${span}": ${resolvedBank.missing_duration}`);
    } else {
      questions.add(resolvedBank.missing_duration);
    }
  }
  if (!hasContext && resolvedBank.attribution) {
    const span = getSpan((unit) => unit.label?.startsWith("SYMPTOM_"));
    if (span) {
      questions.add(`You noted "${span}". ${resolvedBank.attribution}`);
    } else {
      questions.add(resolvedBank.attribution);
    }
  }
  if (hasUncertainty && resolvedBank.uncertainty) {
    const span = getSpan((unit) => unit.attributes?.uncertainty === "HIGH");
    if (span) {
      questions.add(
        `You described "${span}" but seemed unsure. ${resolvedBank.uncertainty}`,
      );
    } else {
      questions.add(resolvedBank.uncertainty);
    }
  }

  return Array.from(questions);
};

const buildAttributesSummary = (
  attributes: {
    temporality?: string | null;
    frequency?: string | null;
    severity?: string | null;
    attribution?: string | null;
    uncertainty?: string | null;
    polarity?: string | null;
  } | null | undefined,
  getIntensityLabel: (severity: string) => string,
) => {
  if (!attributes) return null;
  const parts: string[] = [];

  if (attributes.temporality) parts.push(`Timing: ${attributes.temporality}`);
  if (attributes.frequency) parts.push(`How often: ${attributes.frequency}`);
  if (attributes.severity) parts.push(`Intensity: ${getIntensityLabel(attributes.severity)}`);
  if (attributes.attribution) parts.push(`Linked to: ${attributes.attribution}`);
  if (attributes.uncertainty) parts.push(`Certainty: ${attributes.uncertainty}`);
  if (attributes.polarity) parts.push(`Polarity: ${attributes.polarity}`);

  return parts.length ? parts.join(" • ") : null;
};

const isSymptomSignal = (label: string) => label.startsWith("SYMPTOM_");
const isContextSignal = (label: string) =>
  label.startsWith("CONTEXT_") || label.startsWith("IMPACT_");

const EntryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, setData } = useEntry(id);
  const { deleteEntry, loading: deleting, error: deleteError } = useDeleteEntry();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const { groupEvidenceByPatientLabel, getIntensityLabel, getPatientLabel } = usePatientTranslation();
  const mapping = patientView as PatientViewMapping;

  const formattedEntryDate = useMemo(() => {
    if (!data?.dateISO && !data?.createdAt) return "";
    const value = data.dateISO || data.createdAt || "";
    if (!value) return "";
    return new Date(value).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [data?.createdAt, data?.dateISO]);

  const evidenceUnits = useMemo(() => data?.evidenceUnits || [], [data?.evidenceUnits]);
  const uniqueUnits = useMemo(() => {
    const seen = new Set<string>();
    return evidenceUnits.filter((unit) => {
      const attributes = unit?.attributes ? JSON.stringify(unit.attributes) : "";
      const key = [unit?.label || "", unit?.span || unit?.quote || "", attributes].join("::");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [evidenceUnits]);
  const filteredUnits = useMemo(
    () => uniqueUnits.filter((unit) => !shouldExcludeLabel(unit.label)),
    [uniqueUnits],
  );
  const symptomUnits = useMemo(
    () =>
      filteredUnits.filter(
        (unit) =>
          isSymptomSignal(unit.label) &&
          unit.label !== "SYMPTOM_RISK" &&
          unit.label !== "SYMPTOM_TRAUMA",
      ),
    [filteredUnits],
  );
  const contextUnits = useMemo(
    () => filteredUnits.filter((unit) => isContextSignal(unit.label)),
    [filteredUnits],
  );
  const riskUnits = useMemo(
    () => filteredUnits.filter((unit) => unit.label === "SYMPTOM_RISK"),
    [filteredUnits],
  );
  const groupedSignals = useMemo(
    () => groupEvidenceByPatientLabel(symptomUnits),
    [symptomUnits, groupEvidenceByPatientLabel],
  );
  const questionsToExplore = useMemo(() => {
    const derived = buildDerivedPrompts(filteredUnits, mapping.derived_prompts?.questions_to_explore);
    const generated = buildGeneratedQuestions(filteredUnits, mapping.derived_prompts?.question_bank);
    return Array.from(new Set([...derived, ...generated]));
  }, [filteredUnits, mapping.derived_prompts?.questions_to_explore, mapping.derived_prompts?.question_bank]);
  const contextTags = useMemo(() => (data ? buildContextImpactTags(data) : []), [data]);
  const topSignalLabels = groupedSignals.map((group) => group.patientLabel);
  const handleDelete = async () => {
    if (!data?.id) return;
    await deleteEntry(data.id);
    navigate("/patient/journal");
  };

  useEffect(() => {
    if (!data?.id) return undefined;
    if (data.evidenceUnits?.length) return undefined;

    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    const poll = async () => {
      try {
        const response = await apiFetch<{ entry: typeof data }>(`/entries/${data.id}`);
        setData(response.entry);
        if (response.entry?.evidenceUnits?.length) {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      } catch {
        // keep polling until timeout
      }
    };

    pollTimer.current = window.setInterval(poll, 5000);
    poll();

    return () => {
      if (pollTimer.current) window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [data?.id, data?.evidenceUnits?.length, setData]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
        Loading entry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error || "Entry not found."}
      </div>
    );
  }

  const insightDraftText = data.body || data.summary || "";

  return (
    <div className="grid gap-8 text-slate-900 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="border p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Entry summary</p>
            <h2 className="mt-2 text-3xl font-semibold">{data.title || "Untitled reflection"}</h2>
            <p className="mt-2 text-sm text-slate-500">{formattedEntryDate}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(`/patient/entry/${data.id}/edit`)}>
              Edit entry
            </Button>
            <Button
              variant="ghost"
              className="text-rose-600 hover:text-rose-500"
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
        {deleteError ? (
          <p className="mt-3 text-sm text-rose-600">{deleteError}</p>
        ) : null}
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
            <p className="mt-2 text-sm text-slate-600">{data.summary}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Reflection</h3>
            <p className="mt-2 text-sm text-slate-600">{data.body || "No reflection text available."}</p>
          </div>
        </div>
      </Card>

      <Card className="border p-6">
        <h3 className="text-sm font-semibold text-slate-700">Signals spotted</h3>
        {!evidenceUnits.length ? (
          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-slate-100 loading-bar" aria-hidden />
            <p className="mt-3 text-sm text-slate-500">Processing signals from this entry...</p>
          </div>
        ) : groupedSignals.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {groupedSignals.map((group) => (
              <div key={group.label} className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">{group.patientLabel}</p>
                    <Badge className="bg-slate-100 text-slate-600">{getPatientLabel(group.label)}</Badge>
                  </div>
                  {group.prompt ? (
                    <p className="mt-2 text-sm text-slate-500">{group.prompt}</p>
                  ) : null}
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {group.units.map((unit, index) => {
                      return (
                        <li key={`${unit.label}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                          <p>• {unit.span || unit.quote}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No signals captured yet.</p>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border p-6">
            <h3 className="text-sm font-semibold text-slate-700">Life context</h3>
            {contextTags.length ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {contextTags.map((tag) => (
                    <Badge key={tag} className="bg-slate-100 text-slate-600">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {topSignalLabels.length ? (
                  <p className="mt-3 text-sm text-slate-500">
                    This entry connects {topSignalLabels.slice(0, 2).join(" and ")} with{" "}
                    {contextTags.slice(0, 2).join(" and ")}.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No context signals captured yet.</p>
            )}
            {riskUnits.length ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Safety support: If difficult thoughts are showing up, you’re not alone. Consider reaching out to someone
                you trust or a professional support line.
              </div>
            ) : null}
          </Card>

          <Card className="border p-6">
            <h3 className="text-sm font-semibold text-slate-700">Questions to explore</h3>
            {questionsToExplore.length ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {questionsToExplore.map((prompt) => {
                  const lines = prompt.split("\n");
                  const header = lines[0] || "";
                  const bulletLines = lines.slice(1).filter((line) => line.trim().length > 0);
                  const hasBullets = header.startsWith("Reflecting on") && bulletLines.length > 0;
                  if (!hasBullets) {
                    return (
                      <li key={prompt} className="rounded-xl bg-slate-50 px-3 py-2">
                        {prompt}
                      </li>
                    );
                  }
                  return (
                    <li key={prompt} className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-sm text-slate-600">{header}</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {bulletLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No questions suggested yet.</p>
            )}
          </Card>
        </div>
      </div>
      <div className="lg:col-span-1">
        <LiveInsightPanel
          analysis={{
            emotions: data.emotions || [],
            triggers: data.triggers || [],
            themes: data.themes || [],
            languageReflection: data.languageReflection,
            timeReflection: data.timeReflection,
          }}
          draftText={insightDraftText}
          showQuestions={false}
          processingLabel={
            data.emotions?.length || data.themes?.length || data.triggers?.length
              ? undefined
              : "Processing signals from this entry..."
          }
        />
      </div>
      <ConfirmDeleteEntryModal
        isOpen={showDeleteModal}
        entryTitle={data.title}
        loading={deleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default EntryDetailPage;
