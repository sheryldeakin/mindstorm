import { useMemo } from "react";
import type { CaseEntry } from "../types/clinician";
import useDiagnosticLogic from "./useDiagnosticLogic";

type GateRow = {
  id: string;
  label: string;
  leftStatus: string;
  rightStatus: string;
};

const formatStatus = (status: "MET" | "EXCLUDED" | "UNKNOWN") => {
  if (status === "MET") return "Evidence found";
  if (status === "EXCLUDED") return "Blocked";
  return "Unknown";
};

const GATE_CONFIG = {
  mdd: [
    { id: "mood", label: "Mood signal", labels: ["SYMPTOM_MOOD"] },
    {
      id: "duration",
      label: "Duration ≥ 2 weeks",
      labels: ["DURATION", "TEMPORALITY", "DURATION_COMPUTED_2W"],
    },
    { id: "impairment", label: "Impact gate", labels: ["IMPAIRMENT"] },
    { id: "mania", label: "Mania gate", labels: ["SYMPTOM_MANIA"] },
    { id: "substance", label: "Substance/med context", labels: ["CONTEXT_SUBSTANCE"] },
  ],
  gad: [
    { id: "anxiety", label: "Anxiety signal", labels: ["SYMPTOM_ANXIETY"] },
    { id: "sleep", label: "Sleep change", labels: ["SYMPTOM_SLEEP"] },
    { id: "cognitive", label: "Cognitive strain", labels: ["SYMPTOM_COGNITIVE"] },
  ],
  ptsd: [
    { id: "trauma", label: "Trauma signal", labels: ["SYMPTOM_TRAUMA"] },
    {
      id: "duration",
      label: "Duration ≥ 1 month",
      labels: ["DURATION", "TEMPORALITY", "DURATION_COMPUTED_1_MONTH"],
    },
    { id: "anxiety", label: "Anxiety signal", labels: ["SYMPTOM_ANXIETY"] },
    { id: "sleep", label: "Sleep change", labels: ["SYMPTOM_SLEEP"] },
  ],
};

const useCompareGateRows = (
  entries: CaseEntry[],
  leftId: string,
  rightId: string,
  patientId?: string,
) => {
  const { getStatusForLabels } = useDiagnosticLogic(entries, { patientId });

  return useMemo(() => {
    const leftConfig = GATE_CONFIG[leftId as keyof typeof GATE_CONFIG] || [];
    const rightConfig = GATE_CONFIG[rightId as keyof typeof GATE_CONFIG] || [];

    const gateIds = Array.from(new Set([...leftConfig, ...rightConfig].map((gate) => gate.id)));

    const rows: GateRow[] = gateIds.map((gateId) => {
      const leftGate = leftConfig.find((gate) => gate.id === gateId);
      const rightGate = rightConfig.find((gate) => gate.id === gateId);
      const leftStatus = leftGate ? formatStatus(getStatusForLabels(leftGate.labels)) : "—";
      const rightStatus = rightGate ? formatStatus(getStatusForLabels(rightGate.labels)) : "—";
      return {
        id: gateId,
        label: leftGate?.label || rightGate?.label || gateId,
        leftStatus,
        rightStatus,
      };
    });

    return {
      leftLabel: leftId ? leftId.toUpperCase() : "Select",
      rightLabel: rightId ? rightId.toUpperCase() : "Select",
      rows,
    };
  }, [leftId, rightId, getStatusForLabels]);
};

export default useCompareGateRows;
