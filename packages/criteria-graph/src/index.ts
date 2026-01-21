import type { EvidenceUnit } from "@mindstorm/signal-schema";

export type CriteriaSpec = {
  id: string;
  label: string;
  description: string;
  signals: Array<{
    type: string;
    anyOf: string[];
  }>;
};

export type CriteriaResult = {
  id: string;
  label: string;
  matchedSignals: string[];
  coverage: number;
};

// TODO: wire CriteriaSpec sources; prior spec files are missing from criteria_specs/v1.
const specs: CriteriaSpec[] = [];

export const evaluateCriteria = (spec: CriteriaSpec, evidenceUnits: EvidenceUnit[]): CriteriaResult => {
  const evidenceLabels = new Set(evidenceUnits.map((unit) => unit.label.toLowerCase()));
  const matchedSignals = spec.signals
    .flatMap((signal) => signal.anyOf)
    .filter((label) => evidenceLabels.has(label.toLowerCase()));
  const totalSignals = spec.signals.reduce((sum, signal) => sum + signal.anyOf.length, 0) || 1;

  return {
    id: spec.id,
    label: spec.label,
    matchedSignals,
    coverage: Math.min(1, matchedSignals.length / totalSignals),
  };
};

export const evaluateCriteriaSet = (evidenceUnits: EvidenceUnit[]) =>
  specs.map((spec) => evaluateCriteria(spec, evidenceUnits));

export { evaluateDiagnosticLogic, appendComputedEvidenceToEntries } from "./evaluator";
export type {
  DiagnosticCaseEntry,
  DiagnosticEvidenceUnit,
  DiagnosticJournalEntry,
  DiagnosticLogicOptions,
  DiagnosticLogicState,
  DiagnosticStatus,
} from "./evaluator";
