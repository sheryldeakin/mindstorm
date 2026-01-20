import patientView from "@criteria/depressive_disorders_patient_view.json";
import type { EvidenceUnit as SignalEvidenceUnit } from "@mindstorm/signal-schema";

type EvidenceLabelMapping = {
  patient_label: string;
  reflection_prompt?: string;
  ui_text?: string;
};

type SeverityMapping = {
  label: string;
  description?: string;
};

type PatientViewMapping = {
  evidence_label_mappings?: Record<string, EvidenceLabelMapping>;
  node_mappings?: {
    severity_levels?: Record<string, SeverityMapping>;
  };
};

type EvidenceAttributes = {
  polarity?: string | null;
  temporality?: string | null;
  frequency?: string | null;
  severity?: string | null;
  attribution?: string | null;
  uncertainty?: string | null;
};

export type PatientEvidenceUnit = SignalEvidenceUnit & {
  span?: string;
  attributes?: EvidenceAttributes | null;
};

const humanizeLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());

const mapping = patientView as PatientViewMapping;

const normalizeSeverityKey = (value: string) => value.trim().toUpperCase();

export const usePatientTranslation = () => {
  const labelMappings = mapping.evidence_label_mappings || {};
  const severityLevels = mapping.node_mappings?.severity_levels || {};

  const getPatientLabel = (clinicalLabel: string) =>
    labelMappings[clinicalLabel]?.patient_label || humanizeLabel(clinicalLabel);

  const getReflectionPrompt = (clinicalLabel: string) =>
    labelMappings[clinicalLabel]?.reflection_prompt;

  const getIntensityLabel = (severity: string) => {
    const normalized = normalizeSeverityKey(severity);
    return severityLevels[normalized]?.label || humanizeLabel(normalized);
  };

  const groupEvidenceByPatientLabel = (units: PatientEvidenceUnit[]) => {
    const groups = new Map<
      string,
      { label: string; patientLabel: string; prompt?: string; units: PatientEvidenceUnit[] }
    >();
    units.forEach((unit) => {
      const patientLabel = getPatientLabel(unit.label);
      const prompt = getReflectionPrompt(unit.label);
      if (!groups.has(unit.label)) {
        groups.set(unit.label, {
          label: unit.label,
          patientLabel,
          prompt,
          units: [],
        });
      }
      groups.get(unit.label)?.units.push(unit);
    });
    return Array.from(groups.values());
  };

  return {
    getPatientLabel,
    getReflectionPrompt,
    getIntensityLabel,
    groupEvidenceByPatientLabel,
    humanizeLabel,
  };
};
