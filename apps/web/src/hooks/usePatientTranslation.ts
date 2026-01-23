import { useCallback, useMemo } from "react";
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

const normalizeCode = (rawLabel: string) => {
  if (!rawLabel) return "";
  const candidate = rawLabel.includes(":") ? rawLabel.split(":")[0] : rawLabel;
  return candidate.trim();
};

const humanizeLabel = (value: string) => {
  const code = normalizeCode(value);
  const cleaned = code
    .replace(/^SYMPTOM_/, "")
    .replace(/^IMPACT_/, "")
    .replace(/^CONTEXT_/, "")
    .replace(/^DX_/, "")
    .replace(/_/g, " ");
  const lower = cleaned.trim().toLowerCase();
  if (lower === "risk") return "Safety thoughts";
  if (lower === "mania") return "High energy";
  if (lower === "trauma") return "Difficult memories";
  return lower.replace(/\b\w/g, (match) => match.toUpperCase());
};

const mapping = patientView as PatientViewMapping;

const normalizeSeverityKey = (value: string) => value.trim().toUpperCase();

export const usePatientTranslation = () => {
  const labelMappings = useMemo(() => mapping.evidence_label_mappings || {}, []);
  const severityLevels = useMemo(() => mapping.node_mappings?.severity_levels || {}, []);

  const getPatientLabel = useCallback((clinicalLabel: string) => {
    const code = normalizeCode(clinicalLabel);
    return labelMappings[code]?.patient_label || humanizeLabel(code);
  }, [labelMappings]);

  const getReflectionPrompt = useCallback((clinicalLabel: string) => {
    const code = normalizeCode(clinicalLabel);
    return labelMappings[code]?.reflection_prompt;
  }, [labelMappings]);

  const getIntensityLabel = useCallback((severity: string) => {
    const normalized = normalizeSeverityKey(severity);
    return severityLevels[normalized]?.label || humanizeLabel(normalized);
  }, [severityLevels]);

  const groupEvidenceByPatientLabel = useCallback((units: PatientEvidenceUnit[]) => {
    const groups = new Map<
      string,
      { label: string; patientLabel: string; prompt?: string; units: PatientEvidenceUnit[] }
    >();
    units.forEach((unit) => {
      const normalizedKey = normalizeCode(unit.label);
      const patientLabel = getPatientLabel(normalizedKey);
      const prompt = getReflectionPrompt(normalizedKey);
      if (!groups.has(normalizedKey)) {
        groups.set(normalizedKey, {
          label: normalizedKey,
          patientLabel,
          prompt,
          units: [],
        });
      }
      groups.get(normalizedKey)?.units.push(unit);
    });
    return Array.from(groups.values());
  }, [getPatientLabel, getReflectionPrompt]);

  return {
    getPatientLabel,
    getReflectionPrompt,
    getIntensityLabel,
    groupEvidenceByPatientLabel,
    humanizeLabel,
  };
};
