import type { CaseEntry } from "../types/clinician";
import type { DiagnosticStatus } from "../hooks/useDiagnosticLogic";

const getTimelineSpan = (entries: CaseEntry[]) => {
  if (entries.length < 2) return 0;
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const start = new Date(`${sorted[0].dateISO}T00:00:00Z`);
  const end = new Date(`${sorted[sorted.length - 1].dateISO}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

const hasContextLabel = (entries: CaseEntry[], label: string) =>
  entries.some((entry) =>
    (entry.context_tags || []).some((tag) => tag === label),
  );

const hasEvidenceLabel = (entries: CaseEntry[], label: string) =>
  entries.some((entry) => (entry.evidenceUnits || []).some((unit) => unit.label === label));

export const buildClarificationPrompts = (
  entries: CaseEntry[],
  getStatusForLabels: (labels?: string[]) => DiagnosticStatus,
) => {
  const prompts: string[] = [];
  const spanDays = getTimelineSpan(entries);

  if (spanDays > 0 && spanDays < 14) {
    prompts.push(`Data spans ${spanDays} days. Confirm if symptoms have persisted for ≥ 2 weeks.`);
  }

  if (getStatusForLabels(["SYMPTOM_MANIA"]) === "UNKNOWN") {
    prompts.push("No history of mania detected in journal. Screen for past manic episodes.");
  }

  if (getStatusForLabels(["IMPAIRMENT"]) !== "MET") {
    prompts.push("Functional impairment evidence is limited. Clarify impact on work, social life, or self-care.");
  }

  if (!hasContextLabel(entries, "CONTEXT_SUBSTANCE") && !hasEvidenceLabel(entries, "CONTEXT_SUBSTANCE")) {
    prompts.push("No substance context noted. Ask about alcohol, cannabis, or medication changes.");
  }

  if (!hasContextLabel(entries, "CONTEXT_MEDICAL") && !hasEvidenceLabel(entries, "CONTEXT_MEDICAL")) {
    prompts.push("No medical context noted. Ask about recent medical changes or conditions.");
  }

  return prompts;
};
