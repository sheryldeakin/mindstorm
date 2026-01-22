import patientView from "@criteria/depressive_disorders_patient_view.json";
import type { JournalEntry } from "../types/journal";

type EvidenceLabelMapping = {
  patient_label: string;
};

type PatientViewMapping = {
  evidence_label_mappings?: Record<string, EvidenceLabelMapping>;
  node_mappings?: {
    symptoms?: Record<string, EvidenceLabelMapping>;
    impact_domains?: Record<string, string>;
  };
};

const mapping = patientView as PatientViewMapping;

const humanizeLabel = (value: string) => {
  const cleaned = value
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

const buildLabelMap = () => {
  const map = new Map<string, string>();
  const evidenceMappings = mapping.evidence_label_mappings || {};
  const symptomMappings = mapping.node_mappings?.symptoms || {};
  const impactMappings = mapping.node_mappings?.impact_domains || {};

  Object.entries(symptomMappings).forEach(([label, value]) => {
    if (value?.patient_label) map.set(label, value.patient_label);
  });

  Object.entries(impactMappings).forEach(([label, value]) => {
    if (value) map.set(label, value);
  });

  Object.entries(evidenceMappings).forEach(([label, value]) => {
    if (value?.patient_label) map.set(label, value.patient_label);
  });

  return map;
};

const labelMap = buildLabelMap();

const mapPatientLabel = (label: string) => {
  if (label === "CONTEXT_MEDICAL") return "Physical Health";
  if (label === "CONTEXT_STRESSOR") return "Life Stressors";
  if (label === "IMPACT_WORK") return "Work/School";
  if (label === "SYMPTOM_RISK") return "Safety Support";
  return labelMap.get(label) || humanizeLabel(label);
};

const truncateSummary = (summary: string, maxLength = 80) => {
  if (summary.length <= maxLength) return summary;
  return `${summary.slice(0, maxLength).trim()}…`;
};

export const buildSignalPreview = (entry: JournalEntry, maxLabels = 2) => {
  const units = entry.evidenceUnits || [];
  const labels: string[] = [];

  units.forEach((unit) => {
    if (!unit.label) return;
    if (unit.label.startsWith("DX_") || unit.label.startsWith("THRESHOLD")) return;
    const patientLabel = mapPatientLabel(unit.label);
    if (!labels.includes(patientLabel)) labels.push(patientLabel);
  });

  if (labels.length) {
    return labels.slice(0, maxLabels).join(" \u2022 ");
  }

  if (entry.summary) {
    return truncateSummary(entry.summary);
  }

  return "No signals detected";
};

export const buildContextImpactTags = (entry: JournalEntry | null | undefined, maxLabels = 3) => {
  if (!entry) return [];
  const units = entry.evidenceUnits || [];
  const tags: string[] = [];
  const seen = new Set<string>();

  const addTag = (label: string) => {
    const patientLabel = mapPatientLabel(label);
    if (seen.has(patientLabel)) return;
    seen.add(patientLabel);
    tags.push(patientLabel);
  };

  units.forEach((unit) => {
    if (tags.length >= maxLabels) return;
    if (!unit.label) return;
    if (unit.attributes?.polarity && unit.attributes.polarity !== "PRESENT") return;
    if (unit.label.startsWith("CONTEXT_") || unit.label.startsWith("IMPACT_")) {
      addTag(unit.label);
    }
  });

  if (tags.length < maxLabels) {
    units.forEach((unit) => {
      if (tags.length >= maxLabels) return;
      if (!unit.label) return;
      if (unit.attributes?.polarity && unit.attributes.polarity !== "PRESENT") return;
      if (unit.label === "SYMPTOM_RISK" || unit.label === "SYMPTOM_TRAUMA") return;
      if (unit.label.startsWith("SYMPTOM_")) {
        addTag(unit.label);
      }
    });
  }

  if (!tags.length && Array.isArray(entry.themes) && entry.themes.length) {
    entry.themes.slice(0, maxLabels).forEach((theme) => {
      const formatted = theme
        ? theme.charAt(0).toUpperCase() + theme.slice(1)
        : "";
      if (!formatted || seen.has(formatted)) return;
      seen.add(formatted);
      tags.push(formatted);
    });
  }

  return tags.slice(0, maxLabels);
};
