import { useEffect, useState } from "react";
import CausalityDisclaimer from "../components/features/CausalityDisclaimer";
import ConnectionsGraph from "../components/features/ConnectionsGraph";
import type { ConnectionEdge, ConnectionNode } from "../types/connections";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

const ConnectionsPage = () => {
  const { status } = useAuth();
  const [nodes, setNodes] = useState<ConnectionNode[]>([]);
  const [edges, setEdges] = useState<ConnectionEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<ConnectionEdge | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      "/derived/connections?rangeKey=last_30_days",
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

  return (
    <div className="space-y-8 text-slate-900">
      <section className="ms-card ms-elev-2 rounded-3xl p-6">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Connections</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">Relationships between signals</h2>
            <p className="mt-2 text-sm text-slate-500">
              Explore concurrence stats and temporal correlations across your entries.
            </p>
          </div>
        </div>
      </section>
      <CausalityDisclaimer />
      <ConnectionsGraph
        nodes={nodes}
        edges={edges}
        selectedEdgeId={selectedEdge?.id}
        onEdgeSelect={(edge) => setSelectedEdge(edge)}
        loading={loading}
        emptyState={!!error || (!loading && nodes.length === 0)}
      />
      <section className="ms-card ms-elev-2 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Supporting evidence</h3>
            <p className="mt-1 text-sm text-slate-500">
              {error
                ? "Unable to load evidence yet."
                : selectedEdge
                ? `Quotes for ${selectedEdge.label}.`
                : "Select a connection to view quotes."}
            </p>
          </div>
          {selectedEdge && (
            <button
              type="button"
              onClick={() => setSelectedEdge(undefined)}
              className="text-sm font-medium text-brand hover:text-brandLight"
            >
              Clear
            </button>
          )}
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading evidence...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        ) : selectedEdge ? (
          <div className="mt-6 space-y-4">
            {selectedEdge.evidence.length ? selectedEdge.evidence.map((evidence) => (
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
