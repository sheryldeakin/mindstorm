import { useEffect, useState } from "react";
import CausalityDisclaimer from "../components/features/CausalityDisclaimer";
import ConnectionsGraph from "../components/features/ConnectionsGraph";
import Sparkline from "../components/charts/Sparkline";
import type { ConnectionEdge, ConnectionNode } from "../types/connections";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/layout/PageHeader";
import { usePatientTranslation } from "../hooks/usePatientTranslation";

const CoMovementChart = ({ fromSeries, toSeries }: { fromSeries: number[]; toSeries: number[] }) => (
  <div className="relative h-16 w-full">
    <div className="absolute inset-0 rounded-2xl bg-white/40" />
    <Sparkline
      data={fromSeries}
      variant="up"
      width={240}
      height={64}
      showPoints={false}
      showArea
    />
    <div className="absolute inset-0">
      <Sparkline
        data={toSeries}
        variant="steady"
        width={240}
        height={64}
        showPoints={false}
        showArea={false}
      />
    </div>
  </div>
);

const ConnectionsPage = () => {
  const { status } = useAuth();
  const [nodes, setNodes] = useState<ConnectionNode[]>([]);
  const [edges, setEdges] = useState<ConnectionEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<ConnectionEdge | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getPatientLabel } = usePatientTranslation();

  useEffect(() => {
    if (status !== "authed") {
      setNodes([]);
      setEdges([]);
      setSelectedEdge(undefined);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch<{ graph: { nodes: ConnectionNode[]; edges: ConnectionEdge[] } }>(
      "/derived/connections?rangeKey=all_time",
    )
      .then(({ graph }) => {
        setNodes(graph.nodes || []);
        setEdges(graph.edges || []);
        setSelectedEdge(undefined);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load connections.");
        setNodes([]);
        setEdges([]);
        setSelectedEdge(undefined);
      })
      .finally(() => setLoading(false));
  }, [status]);

  const mapConnectionLabel = (label: string) => {
    const raw = String(label || "").trim();
    if (!raw) return "";
    if (raw.includes("<->")) {
      return raw
        .split("<->")
        .map((chunk) => mapConnectionLabel(chunk.trim()))
        .filter(Boolean)
        .join(" <-> ");
    }
    if (raw === "CONTEXT_STRESSOR") return "Life Stressors";
    if (raw === "CONTEXT_MEDICAL") return "Physical Health";
    if (raw === "CONTEXT_SUBSTANCE") return "Substance or medication changes";
    const base = raw.includes(":") ? raw.split(":")[0].trim() : raw;
    const normalized = base.replace(/\s+/g, "_").toUpperCase();
    if (normalized === "SYMPTOM_MOOD") return "Low mood";
    if (normalized === "SYMPTOM_ANHEDONIA") return "Loss of interest";
    if (
      normalized.startsWith("SYMPTOM_") ||
      normalized.startsWith("IMPACT_") ||
      normalized.startsWith("CONTEXT_")
    ) {
      return getPatientLabel(normalized);
    }
    return getPatientLabel(raw);
  };

  const normalizeKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.:]+$/g, "")
      .trim();

  const mappedNodes = nodes.map((node) => ({
    ...node,
    label: mapConnectionLabel(node.label),
  }));

  const nodeMap = new Map<string, ConnectionNode>();
  const nodeKeyById = new Map<string, string>();
  mappedNodes.forEach((node) => {
    const key = normalizeKey(node.label);
    if (!nodeMap.has(key)) {
      nodeMap.set(key, { ...node, id: key, label: node.label });
    }
    nodeKeyById.set(node.id, key);
  });

  const mergedEdges = new Map<string, ConnectionEdge>();
  mappedNodes.forEach((node) => {
    if (!nodeKeyById.has(node.id)) {
      nodeKeyById.set(node.id, normalizeKey(node.label));
    }
  });

  edges.forEach((edge) => {
    const fromKey = nodeKeyById.get(edge.from) || normalizeKey(mapConnectionLabel(edge.from));
    const toKey = nodeKeyById.get(edge.to) || normalizeKey(mapConnectionLabel(edge.to));
    if (!fromKey || !toKey || fromKey === toKey) return;
    const pairKey = [fromKey, toKey].sort().join("__");
    const existing = mergedEdges.get(pairKey);
    const fromLabel = nodeMap.get(fromKey)?.label || mapConnectionLabel(edge.from);
    const toLabel = nodeMap.get(toKey)?.label || mapConnectionLabel(edge.to);
    const next = {
      ...edge,
      id: pairKey,
      from: fromKey,
      to: toKey,
      label: `${fromLabel} <-> ${toLabel}`,
      strength: existing ? Math.max(existing.strength, edge.strength) : edge.strength,
      evidence: existing
        ? [...existing.evidence, ...(edge.evidence || [])].filter(
            (item, index, self) =>
              index === self.findIndex((other) => other.quote === item.quote && other.source === item.source),
          )
        : edge.evidence || [],
    };
    mergedEdges.set(pairKey, next);
  });

  const mappedEdges = Array.from(mergedEdges.values());
  const selectedMappedEdge = selectedEdge
    ? mappedEdges.find((edge) => edge.id === selectedEdge.id)
    : mappedEdges[0];
  const mappedNodeList = Array.from(nodeMap.values());

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="connections" />
      <CausalityDisclaimer />
      <ConnectionsGraph
        nodes={mappedNodeList}
        edges={mappedEdges}
        selectedEdgeId={selectedMappedEdge?.id}
        onEdgeSelect={(edge) => {
          setSelectedEdge(edge);
        }}
        loading={loading}
        emptyState={!!error || (!loading && mappedNodeList.length === 0)}
      />
      <section className="ms-card ms-elev-2 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Supporting evidence</h3>
            <p className="mt-1 text-sm text-slate-500">
              {error
                ? "Unable to load evidence yet."
                : selectedMappedEdge
                ? `These often appear together in your writing.`
                : "Select a connection to view quotes."}
            </p>
          </div>
          {selectedMappedEdge && (
            <button
              type="button"
              onClick={() => setSelectedEdge(undefined)}
              className="text-sm font-medium text-brand hover:text-brandLight"
            >
              Clear
            </button>
          )}
        </div>
        {selectedMappedEdge?.movement ? (
          <div className="mt-6 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Movement</p>
            {selectedMappedEdge.movement.fromSeries.length && selectedMappedEdge.movement.toSeries.length ? (
              <>
                <CoMovementChart
                  fromSeries={selectedMappedEdge.movement.fromSeries || []}
                  toSeries={selectedMappedEdge.movement.toSeries || []}
                />
                <p className="text-sm text-slate-500">{selectedMappedEdge.movement.summary}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No co-movement data available yet.</p>
            )}
          </div>
        ) : null}
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading evidence...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        ) : selectedMappedEdge ? (
          <div className="mt-6 space-y-4">
            {selectedMappedEdge.evidence.length ? (
              selectedMappedEdge.evidence.map((evidence, index) => (
                <div
                  key={`${evidence.id}-${evidence.source}-${index}`}
                  className="ms-glass-surface rounded-2xl border p-4"
                >
                  <p className="text-sm text-slate-700">“{evidence.quote}”</p>
                  <p className="mt-2 text-xs text-slate-400">{evidence.source}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No quotes attached to this connection yet.</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Tap an edge to surface the most relevant quotes.</p>
        )}
      </section>
    </div>
  );
};

export default ConnectionsPage;
