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
    { id: "duration", label: "Duration ≥ 2 weeks", labels: [] },
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
    { id: "anxiety", label: "Anxiety signal", labels: ["SYMPTOM_ANXIETY"] },
    { id: "sleep", label: "Sleep change", labels: ["SYMPTOM_SLEEP"] },
  ],
};

const useCompareGateRows = (entries: CaseEntry[], leftId: string, rightId: string) => {
  const { getStatusForLabels, currentEntries } = useDiagnosticLogic(entries);

  return useMemo(() => {
    const leftConfig = GATE_CONFIG[leftId as keyof typeof GATE_CONFIG] || [];
    const rightConfig = GATE_CONFIG[rightId as keyof typeof GATE_CONFIG] || [];

    const gateIds = Array.from(new Set([...leftConfig, ...rightConfig].map((gate) => gate.id)));
    const spanDays = (() => {
      if (currentEntries.length < 2) return currentEntries.length;
      const sorted = [...currentEntries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
      const start = new Date(`${sorted[0].dateISO}T00:00:00Z`);
      const end = new Date(`${sorted[sorted.length - 1].dateISO}T00:00:00Z`);
      return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    })();

    const rows: GateRow[] = gateIds.map((gateId) => {
      const leftGate = leftConfig.find((gate) => gate.id === gateId);
      const rightGate = rightConfig.find((gate) => gate.id === gateId);
      const leftStatus =
        leftGate?.id === "duration"
          ? spanDays >= 14
            ? "Evidence found"
            : "Unknown"
          : leftGate
            ? formatStatus(getStatusForLabels(leftGate.labels))
            : "—";
      const rightStatus =
        rightGate?.id === "duration"
          ? spanDays >= 14
            ? "Evidence found"
            : "Unknown"
          : rightGate
            ? formatStatus(getStatusForLabels(rightGate.labels))
            : "—";
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
  }, [entries, leftId, rightId, getStatusForLabels]);
};

export default useCompareGateRows;
