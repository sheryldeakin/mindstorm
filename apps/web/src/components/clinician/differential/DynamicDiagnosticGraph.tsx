import clsx from "clsx";
import type { CaseEntry } from "../../../types/clinician";
import useDiagnosticLogic from "../../../hooks/useDiagnosticLogic";
import {
  getDepressiveDiagnosisByKey,
  getDepressiveConfigByKey,
  mapNodeToEvidence,
  type DepressiveDiagnosisKey,
} from "../../../lib/depressiveCriteriaConfig";

type GraphMode = "core" | "full";

type GraphNode = {
  id: string;
  label: string;
  kind: "diagnosis" | "symptom" | "gate" | "exclusion";
  evidenceLabels?: string[];
};

type DynamicDiagnosticGraphProps = {
  diagnosisKey: DepressiveDiagnosisKey;
  entries: CaseEntry[];
  mode: GraphMode;
  onNodeSelect?: (node: GraphNode) => void;
  nodeOverrides?: Record<string, "MET" | "EXCLUDED" | "UNKNOWN">;
  onOverrideChange?: (nodeId: string, status: "MET" | "EXCLUDED" | "UNKNOWN" | null) => void;
};

const statusClass = (status: string) => {
  if (status === "MET") return "bg-emerald-100 border-emerald-400 text-emerald-700";
  if (status === "EXCLUDED") return "bg-rose-100 border-rose-400 text-rose-700";
  return "bg-slate-50 border-dashed border-slate-300 text-slate-500";
};

const kindForNode = (type?: string) => {
  if (type === "DIAGNOSIS") return "diagnosis";
  if (type === "SYMPTOM") return "symptom";
  if (type === "RULE_OUT") return "exclusion";
  if (type === "THRESHOLD" || type === "DURATION" || type === "IMPAIRMENT") return "gate";
  if (type === "CONTEXT" || type === "HISTORY") return "gate";
  return "gate";
};

const buildCoreNodeIds = (diagnosis: any) => {
  const threshold = (diagnosis.nodes || []).find(
    (node: any) => node?.type === "THRESHOLD" && node?.rule?.kind === "k_of_n",
  );
  const groupId = threshold?.rule?.group_id;
  const group = (diagnosis.groups || []).find((item: any) => item.id === groupId);
  const coreIds = new Set<string>();
  if (group?.member_node_ids?.length) {
    group.member_node_ids.forEach((id: string) => coreIds.add(id));
  }
  (diagnosis.nodes || []).forEach((node: any) => {
    if (node?.type === "DIAGNOSIS" || node?.type === "DURATION" || node?.type === "IMPAIRMENT") {
      coreIds.add(node.id);
    }
  });
  if (coreIds.size === 0) {
    (diagnosis.nodes || []).forEach((node: any) => coreIds.add(node.id));
  }
  return coreIds;
};

const toGraphNodes = (diagnosis: any, mode: GraphMode): GraphNode[] => {
  if (!diagnosis) return [];
  const coreIds = buildCoreNodeIds(diagnosis);
  return (diagnosis.nodes || [])
    .filter((node: any) => (mode === "core" ? coreIds.has(node.id) : true))
    .map((node: any) => ({
      id: node.id,
      label:
        node.labels?.clinician ||
        node.labels?.self ||
        node.description?.clinician ||
        node.id,
      kind: kindForNode(node.type),
      evidenceLabels: mapNodeToEvidence(node.id),
    }));
};

const DynamicDiagnosticGraph = ({
  diagnosisKey,
  entries,
  mode,
  onNodeSelect,
  nodeOverrides,
  onOverrideChange,
}: DynamicDiagnosticGraphProps) => {
  const diagnosis = getDepressiveDiagnosisByKey(diagnosisKey);
  const config = getDepressiveConfigByKey(diagnosisKey);
  const nodes = toGraphNodes(diagnosis, mode);
  const baseLogic = useDiagnosticLogic(entries, { windowDays: 36500 });
  const { getStatusForLabels } = useDiagnosticLogic(entries, { windowDays: 36500, overrides: nodeOverrides });

  const criteriaCount = config
    ? config.criteria.reduce((count, criterion) => {
        const status = getStatusForLabels(criterion.evidenceLabels);
        return count + (status === "MET" ? 1 : 0);
      }, 0)
    : 0;

  const getNodeStatus = (node: GraphNode) => {
    if (nodeOverrides?.[node.id]) return nodeOverrides[node.id];
    if (node.kind === "diagnosis" && config) {
      return criteriaCount >= config.required ? "MET" : "UNKNOWN";
    }
    return getStatusForLabels(node.evidenceLabels);
  };

  const renderColumn = (kind: GraphNode["kind"], title: string) => {
    const columnNodes = nodes.filter((node) => node.kind === kind);
    if (!columnNodes.length) return null;
    return (
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
        <div className="mt-3 space-y-3">
          {columnNodes.map((node) => {
            const status = getNodeStatus(node);
            const overrideStatus = nodeOverrides?.[node.id] || null;
            const autoStatus = node.evidenceLabels?.length
              ? baseLogic.getStatusForLabels(node.evidenceLabels)
              : status;
            const statusLabel =
              status === "MET" ? "Evidence found" : status === "EXCLUDED" ? "Evidence denied" : "No signal";
            return (
              <div
                key={node.id}
                className={clsx(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition",
                  statusClass(status),
                )}
              >
                <button
                  type="button"
                  onClick={() => onNodeSelect?.(node)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className={clsx("truncate", overrideStatus === "EXCLUDED" && "line-through")}>
                    {node.label}
                  </span>
                  <span className="text-[11px] uppercase">{statusLabel}</span>
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onOverrideChange?.(node.id, null)}
                    className={clsx(
                      "rounded-full border px-2 py-1",
                      !overrideStatus
                        ? "border-slate-300 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500",
                    )}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => onOverrideChange?.(node.id, "MET")}
                    className={clsx(
                      "rounded-full border px-2 py-1",
                      overrideStatus === "MET"
                        ? "border-emerald-400 bg-emerald-100 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500",
                    )}
                  >
                    Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => onOverrideChange?.(node.id, "EXCLUDED")}
                    className={clsx(
                      "rounded-full border px-2 py-1",
                      overrideStatus === "EXCLUDED"
                        ? "border-rose-400 bg-rose-100 text-rose-700"
                        : "border-slate-200 bg-white text-slate-500",
                    )}
                  >
                    Rejected
                  </button>
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
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {renderColumn("diagnosis", "Criteria set")}
      {renderColumn("symptom", "Evidence signals")}
      {renderColumn("gate", "Gating criteria")}
      {renderColumn("exclusion", "Exclusionary gates")}
    </div>
  );
};

export default DynamicDiagnosticGraph;
export type { GraphMode, GraphNode };
