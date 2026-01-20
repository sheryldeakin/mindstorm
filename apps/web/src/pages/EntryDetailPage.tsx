import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { EvidenceUnit } from "../types/journal";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import useEntry from "../hooks/useEntry";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import patientView from "@criteria/depressive_disorders_patient_view.json";

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

type PatientViewMapping = {
  derived_prompts?: {
    unclear_areas?: DerivedPrompt[];
    questions_to_explore?: DerivedPrompt[];
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

const EntryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useEntry(id);
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
  const filteredUnits = useMemo(
    () => evidenceUnits.filter((unit) => !shouldExcludeLabel(unit.label)),
    [evidenceUnits],
  );
  const groupedSignals = useMemo(
    () => groupEvidenceByPatientLabel(filteredUnits),
    [filteredUnits, groupEvidenceByPatientLabel],
  );
  const questionsToExplore = useMemo(
    () => buildDerivedPrompts(filteredUnits, mapping.derived_prompts?.questions_to_explore),
    [filteredUnits, mapping.derived_prompts?.questions_to_explore],
  );

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

  return (
    <div className="space-y-6 text-slate-900">
      <Card className="border p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Entry summary</p>
            <h2 className="mt-2 text-3xl font-semibold">{data.title || "Untitled reflection"}</h2>
            <p className="mt-2 text-sm text-slate-500">{formattedEntryDate}</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/patient/entry/${data.id}/edit`)}>
            Edit entry
          </Button>
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700">Reflection</h3>
          <p className="mt-2 text-sm text-slate-600">{data.summary}</p>
        </div>
      </Card>

      <Card className="border p-6">
        <h3 className="text-sm font-semibold text-slate-700">Signals spotted</h3>
        {groupedSignals.length ? (
          <div className="mt-4 space-y-4">
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
                    const attributes = buildAttributesSummary(unit.attributes, getIntensityLabel);
                    return (
                      <li key={`${unit.label}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p>• {unit.span || unit.quote}</p>
                        {attributes ? <p className="mt-1 text-xs text-slate-400">{attributes}</p> : null}
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

      <Card className="border p-6">
        <h3 className="text-sm font-semibold text-slate-700">Questions to explore</h3>
        {questionsToExplore.length ? (
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {questionsToExplore.map((prompt) => (
              <li key={prompt} className="rounded-xl bg-slate-50 px-3 py-2">
                {prompt}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No questions suggested yet.</p>
        )}
      </Card>
    </div>
  );
};

export default EntryDetailPage;
