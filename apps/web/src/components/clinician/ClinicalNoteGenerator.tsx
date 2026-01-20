import { useMemo, useState } from "react";
import type { CaseEntry } from "../../types/clinician";
import type { DiagnosticStatus } from "../../hooks/useDiagnosticLogic";
import { DIAGNOSTIC_GRAPH_NODES } from "../../lib/diagnosticGraphConfig";
import ICDCodeGenerator from "./ICDCodeGenerator";

type ClinicalNoteGeneratorProps = {
  entries: CaseEntry[];
  getStatusForLabels: (labels?: string[]) => DiagnosticStatus;
  nodeOverrides: Record<string, DiagnosticStatus>;
};

const getTimelineSpanDays = (entries: CaseEntry[]) => {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const start = new Date(`${sorted[0].dateISO}T00:00:00Z`);
  const end = new Date(`${sorted[sorted.length - 1].dateISO}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const ClinicalNoteGenerator = ({
  entries,
  getStatusForLabels,
  nodeOverrides,
}: ClinicalNoteGeneratorProps) => {
  const draft = useMemo(() => {
    const symptomNodes = DIAGNOSTIC_GRAPH_NODES.filter((node) => node.kind === "symptom");
    const gateNodes = DIAGNOSTIC_GRAPH_NODES.filter((node) => node.kind === "gate");
    const exclusionNodes = DIAGNOSTIC_GRAPH_NODES.filter((node) => node.kind === "exclusion");

    const metSymptoms = symptomNodes.filter(
      (node) => getStatusForLabels(node.evidenceLabels) === "MET",
    );
    const unknownGates = gateNodes.filter((node) => {
      if (node.id === "duration") {
        if (nodeOverrides[node.id]) return nodeOverrides[node.id] === "UNKNOWN";
        return getTimelineSpanDays(entries) < 14;
      }
      if (nodeOverrides[node.id]) return nodeOverrides[node.id] === "UNKNOWN";
      return getStatusForLabels(node.evidenceLabels) === "UNKNOWN";
    });

    const contextSignals = new Set<string>();
    entries.forEach((entry) => {
      (entry.context_tags || []).forEach((tag) => contextSignals.add(tag));
      (entry.evidenceUnits || []).forEach((unit) => {
        if (unit.label.startsWith("CONTEXT_") && unit.attributes?.polarity === "PRESENT") {
          contextSignals.add(unit.label.replace(/_/g, " ").toLowerCase());
        }
      });
    });

    const ruleOuts = exclusionNodes.filter(
      (node) => getStatusForLabels(node.evidenceLabels) === "MET",
    );

    const metCount = metSymptoms.length;
    const totalCount = symptomNodes.length;
    const primaryStatus =
      metCount >= 5 ? "met" : metCount >= Math.ceil(totalCount / 2) ? "partial" : "insufficient";

    return [
      "Criteria Alignment Summary",
      `Primary Pattern: Major Depressive Disorder criteria are ${primaryStatus} (${metCount}/${totalCount} signals met).`,
      metSymptoms.length
        ? `Evidence: Key signals include ${metSymptoms
            .map((node) => node.label.toLowerCase())
            .join(", ")}.`
        : "Evidence: Key signals are currently limited.",
      unknownGates.length
        ? `Gaps: The following gates require clarification — ${unknownGates
            .map((node) => node.label)
            .join(", ")}.`
        : "Gaps: No major gate gaps identified.",
      ruleOuts.length
        ? `Context: Active exclusion signals include ${ruleOuts
            .map((node) => node.label.toLowerCase())
            .join(", ")}.`
        : contextSignals.size
          ? `Context: Notable context signals include ${Array.from(contextSignals).join(", ")}.`
          : "Context: No notable attribution signals captured.",
    ].join("\n");
  }, [entries, getStatusForLabels, nodeOverrides]);

  const [note, setNote] = useState(draft);

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm focus:border-brand focus:outline-none"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        aria-label="Clinical note draft"
      />
      <button
        type="button"
        onClick={() => setNote(draft)}
        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600"
      >
        Reset draft
      </button>
      <ICDCodeGenerator entries={entries} />
    </div>
  );
};

export default ClinicalNoteGenerator;
