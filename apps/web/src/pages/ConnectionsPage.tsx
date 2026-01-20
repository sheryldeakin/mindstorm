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
        setSelectedEdge((graph.edges || [])[0]);
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
    if (label === "CONTEXT_STRESSOR") return "Life Stressors";
    if (label === "CONTEXT_MEDICAL") return "Physical Health";
    return getPatientLabel(label);
  };

  const mappedNodes = nodes.map((node) => ({
    ...node,
    label: mapConnectionLabel(node.label),
  }));

  const mappedEdges = edges.map((edge) => ({
    ...edge,
    label: mapConnectionLabel(edge.label),
  }));

  const selectedMappedEdge = mappedEdges.find((edge) => edge.id === selectedEdge?.id);

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="connections" />
      <CausalityDisclaimer />
      <ConnectionsGraph
        nodes={mappedNodes}
        edges={mappedEdges}
        selectedEdgeId={selectedMappedEdge?.id}
        onEdgeSelect={(edge) => {
          const original = edges.find((item) => item.id === edge.id);
          setSelectedEdge(original);
        }}
        loading={loading}
        emptyState={!!error || (!loading && mappedNodes.length === 0)}
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
            {selectedMappedEdge.evidence.length ? selectedMappedEdge.evidence.map((evidence) => (
              <div key={evidence.id} className="ms-glass-surface rounded-2xl border p-4">
                <p className="text-sm text-slate-700">“{evidence.quote}”</p>
                <p className="mt-2 text-xs text-slate-400">{evidence.source}</p>
              </div>
            )) : (
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
