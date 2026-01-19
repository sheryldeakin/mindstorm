import clsx from "clsx";
import type { CaseEntry } from "../../types/clinician";
import useDiagnosticLogic from "../../hooks/useDiagnosticLogic";
import { DIAGNOSTIC_GRAPH_NODES } from "../../lib/diagnosticGraphConfig";

type GraphNode = {
  id: string;
  label: string;
  kind: "diagnosis" | "symptom" | "gate" | "exclusion";
  evidenceLabels?: string[];
};

type DiagnosticLogicGraphProps = {
  entries: CaseEntry[];
  overrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  nodeOverrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  rejectedEvidenceKeys?: Set<string>;
  onNodeSelect: (node: GraphNode) => void;
};

const NODES: GraphNode[] = DIAGNOSTIC_GRAPH_NODES;

const statusClass = (status: string) => {
  if (status === "MET") return "bg-emerald-100 border-emerald-400 text-emerald-700";
  if (status === "EXCLUDED") return "bg-rose-100 border-rose-400 text-rose-700";
  return "bg-slate-50 border-dashed border-slate-300 text-slate-500";
};

const DiagnosticLogicGraph = ({
  entries,
  overrides,
  nodeOverrides,
  rejectedEvidenceKeys,
  onNodeSelect,
}: DiagnosticLogicGraphProps) => {
  const diagnosisNodes = NODES.filter((node) => node.kind === "diagnosis");
  const symptomNodes = NODES.filter((node) => node.kind === "symptom");
  const gateNodes = NODES.filter((node) => node.kind === "gate");
  const exclusionNodes = NODES.filter((node) => node.kind === "exclusion");
  const { getStatusForLabels } = useDiagnosticLogic(entries, { overrides, rejectedEvidenceKeys });

  const impairmentStatus = getStatusForLabels(["IMPAIRMENT"]);
  const symptomMetCount = symptomNodes.filter(
    (node) => getStatusForLabels(node.evidenceLabels) === "MET",
  ).length;

  const getTimelineSpanDays = () => {
    if (!entries.length) return 0;
    const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const start = new Date(`${sorted[0].dateISO}T00:00:00Z`);
    const end = new Date(`${sorted[sorted.length - 1].dateISO}T00:00:00Z`);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };
  const spanDays = getTimelineSpanDays();

  const getNodeStatus = (node: GraphNode) => {
    if (node.id === "mdd-root") {
      if (nodeOverrides?.[node.id]) return nodeOverrides[node.id];
      if (impairmentStatus === "EXCLUDED") return "EXCLUDED";
      if (impairmentStatus !== "MET") return "UNKNOWN";
      return symptomMetCount >= 5 ? "MET" : "UNKNOWN";
    }
    if (node.id === "duration") {
      if (nodeOverrides?.[node.id]) return nodeOverrides[node.id];
      return spanDays >= 14 ? "MET" : "UNKNOWN";
    }
    return getStatusForLabels(node.evidenceLabels);
  };

  const renderColumn = (nodes: GraphNode[]) => (
    <div className="space-y-3">
      {nodes.map((node) => {
        const status = getNodeStatus(node);
        const overrideStatus =
          nodeOverrides?.[node.id] ||
          node.evidenceLabels?.map((label) => overrides?.[label]).find((item) => item) ||
          null;
        const statusLabel =
          status === "MET"
            ? "Evidence found"
            : status === "EXCLUDED"
              ? "Evidence denied"
              : "No signal";
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onNodeSelect(node)}
            className={clsx(
              "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
              statusClass(status),
            )}
          >
            <div className="flex items-center justify-between">
              <span>{node.label}</span>
              <span className="text-[11px] uppercase">{statusLabel}</span>
            </div>
            {overrideStatus ? (
              <span className="mt-1 inline-flex text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Clinician override
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Criteria set</p>
        <div className="mt-3">{renderColumn(diagnosisNodes)}</div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Evidence signals</p>
        <div className="mt-3">{renderColumn(symptomNodes)}</div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gating criteria</p>
        <div className="mt-3">{renderColumn(gateNodes)}</div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Exclusionary gates</p>
        <div className="mt-3">{renderColumn(exclusionNodes)}</div>
      </div>
    </div>
  );
};

export default DiagnosticLogicGraph;
