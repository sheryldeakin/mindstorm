import clsx from "clsx";
import type { CaseEntry } from "../../types/clinician";
import useDiagnosticLogic from "../../hooks/useDiagnosticLogic";
import { DIAGNOSTIC_GRAPH_NODES } from "../../lib/diagnosticGraphConfig";
import StatusDecisionMenu from "./StatusDecisionMenu";

type GraphNode = {
  id: string;
  label: string;
  kind: "diagnosis" | "symptom" | "gate" | "exclusion";
  evidenceLabels?: string[];
};

/**
 * Props for DiagnosticLogicGraph (Clinician-Facing).
 * Clinical precision required; visualizes DSM logic graph status.
 */
type DiagnosticLogicGraphProps = {
  entries: CaseEntry[];
  patientId?: string;
  overrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  nodeOverrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  rejectedEvidenceKeys?: Set<string>;
  lastAccessISO?: string | null;
  onNodeSelect: (node: GraphNode) => void;
  onOverrideChange?: (
    nodeId: string,
    status: "MET" | "EXCLUDED" | "UNKNOWN" | null,
    note?: string,
  ) => void;
};

const NODES: GraphNode[] = DIAGNOSTIC_GRAPH_NODES;

const statusClass = (status: string, weakSignal: boolean) => {
  if (status === "MET") {
    return weakSignal
      ? "bg-amber-50 border-amber-300 text-amber-700 border-dashed"
      : "bg-emerald-100 border-emerald-400 text-emerald-700";
  }
  if (status === "EXCLUDED") return "bg-rose-100 border-rose-400 text-rose-700";
  return "bg-slate-50 border-dashed border-slate-300 text-slate-500";
};

const DiagnosticLogicGraph = ({
  entries,
  patientId,
  overrides,
  nodeOverrides,
  rejectedEvidenceKeys,
  lastAccessISO,
  onNodeSelect,
  onOverrideChange,
}: DiagnosticLogicGraphProps) => {
  const diagnosisNodes = NODES.filter((node) => node.kind === "diagnosis");
  const symptomNodes = NODES.filter((node) => node.kind === "symptom");
  const gateNodes = NODES.filter((node) => node.kind === "gate");
  const exclusionNodes = NODES.filter((node) => node.kind === "exclusion");
  const baseLogic = useDiagnosticLogic(entries, { rejectedEvidenceKeys, patientId });
  const { getStatusForLabels } = baseLogic;
  const lastAccessDate = lastAccessISO ? new Date(lastAccessISO) : null;
  const priorEntries = lastAccessDate
    ? entries.filter((entry) => new Date(`${entry.dateISO}T00:00:00Z`) <= lastAccessDate)
    : [];
  const priorLogic = useDiagnosticLogic(priorEntries, { rejectedEvidenceKeys, useServer: false });

  const impairmentStatus = getStatusForLabels(["IMPAIRMENT"]);
  const symptomMetCount = symptomNodes.filter(
    (node) => getStatusForLabels(node.evidenceLabels) === "MET",
  ).length;

  const getNodeStatus = (node: GraphNode) => {
    if (node.id === "mdd-root") {
      if (nodeOverrides?.[node.id]) return nodeOverrides[node.id];
      if (impairmentStatus === "EXCLUDED") return "EXCLUDED";
      if (impairmentStatus !== "MET") return "UNKNOWN";
      return symptomMetCount >= 5 ? "MET" : "UNKNOWN";
    }
    if (nodeOverrides?.[node.id]) return nodeOverrides[node.id];
    return getStatusForLabels(node.evidenceLabels);
  };

  const getPriorNodeStatus = (node: GraphNode) => {
    if (!lastAccessDate) return "UNKNOWN";
    if (node.id === "mdd-root") {
      const impairmentStatus = priorLogic.getStatusForLabels(["IMPAIRMENT"]);
      const symptomMetCount = symptomNodes.filter(
        (item) => priorLogic.getStatusForLabels(item.evidenceLabels) === "MET",
      ).length;
      if (impairmentStatus === "EXCLUDED") return "EXCLUDED";
      if (impairmentStatus !== "MET") return "UNKNOWN";
      return symptomMetCount >= 5 ? "MET" : "UNKNOWN";
    }
    if (nodeOverrides?.[node.id]) return nodeOverrides[node.id];
    return priorLogic.getStatusForLabels(node.evidenceLabels);
  };

  const isWeakSignal = (labels?: string[]) => {
    if (!labels?.length) return false;
    const units = entries
      .flatMap((entry) => entry.evidenceUnits || [])
      .filter(
        (unit) => labels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
      );
    if (!units.length) return false;
    return units.every((unit) => unit.attributes?.uncertainty === "HIGH");
  };

  const renderColumn = (nodes: GraphNode[]) => (
    <div className="space-y-3">
      {nodes.map((node) => {
        const status = getNodeStatus(node);
        const weakSignal = status === "MET" && isWeakSignal(node.evidenceLabels);
        const priorStatus = getPriorNodeStatus(node);
        const hasChanged =
          lastAccessDate && priorStatus !== "UNKNOWN" && status !== priorStatus;
        const overrideStatus = nodeOverrides?.[node.id] || null;
        const autoStatus = node.evidenceLabels?.length
          ? baseLogic.getStatusForLabels(node.evidenceLabels)
          : status;
        const statusLabel =
          status === "MET"
            ? weakSignal
              ? "Suspected"
              : "Evidence found"
            : status === "EXCLUDED"
              ? "Evidence denied"
              : "No signal";
        return (
          <div
            key={node.id}
            className={clsx(
              "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
              statusClass(status, weakSignal),
              hasChanged && "relative ring-2 ring-sky-300 animate-pulse",
            )}
          >
            <button
              type="button"
              onClick={() => onNodeSelect(node)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className={clsx(overrideStatus === "EXCLUDED" && "line-through")}>{node.label}</span>
              <span className="text-[11px] uppercase">
                {statusLabel}
                {hasChanged ? <span className="ml-2 text-sky-500">New</span> : null}
              </span>
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <StatusDecisionMenu
                autoStatus={autoStatus as "MET" | "EXCLUDED" | "UNKNOWN"}
                overrideStatus={overrideStatus}
                onUpdate={(status, note) => onOverrideChange?.(node.id, status, note)}
              />
              {overrideStatus ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Auto: {autoStatus} · Override: {overrideStatus}
                </span>
              ) : null}
            </div>
          </div>
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
