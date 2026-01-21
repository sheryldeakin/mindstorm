import { useState } from "react";
import type { CaseEntry } from "../../../types/clinician";
import DynamicDiagnosticGraph, { type GraphMode } from "./DynamicDiagnosticGraph";
import type { DepressiveDiagnosisKey } from "../../../lib/depressiveCriteriaConfig";

/**
 * Props for ReasoningGraphAccordion (Clinician-Facing).
 * Clinical precision required; expands diagnostic reasoning graphs.
 */
type ReasoningGraphAccordionProps = {
  diagnosisKey: DepressiveDiagnosisKey;
  entries: CaseEntry[];
  nodeOverrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  onOverrideChange?: (nodeId: string, status: "MET" | "EXCLUDED" | "UNKNOWN" | null) => void;
  lastAccessISO?: string | null;
};

const ReasoningGraphAccordion = ({
  diagnosisKey,
  entries,
  nodeOverrides,
  onOverrideChange,
  lastAccessISO,
}: ReasoningGraphAccordionProps) => {
  const [mode, setMode] = useState<GraphMode>("core");
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        View diagnostic reasoning graph
      </summary>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Display:</span>
        <button
          type="button"
          onClick={() => setMode("core")}
          className={`rounded-full px-3 py-1 ${mode === "core" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
        >
          Core criteria only
        </button>
        <button
          type="button"
          onClick={() => setMode("full")}
          className={`rounded-full px-3 py-1 ${mode === "full" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
        >
          Full graph
        </button>
      </div>
      <div className="mt-4">
        <DynamicDiagnosticGraph
          diagnosisKey={diagnosisKey}
          entries={entries}
          mode={mode}
          nodeOverrides={nodeOverrides}
          onOverrideChange={onOverrideChange}
          lastAccessISO={lastAccessISO}
        />
      </div>
    </details>
  );
};

export default ReasoningGraphAccordion;
