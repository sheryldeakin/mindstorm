import { useState } from "react";
import CausalityDisclaimer from "../components/features/CausalityDisclaimer";
import ConnectionsGraph from "../components/features/ConnectionsGraph";
import type { ConnectionEdge, ConnectionNode } from "../types/connections";

const nodes: ConnectionNode[] = [
  { id: "sleep", label: "Sleep" },
  { id: "energy", label: "Energy" },
  { id: "stress", label: "Stress" },
  { id: "edge", label: "On edge" },
  { id: "focus", label: "Focus" },
  { id: "connection", label: "Connection" },
];

const edges: ConnectionEdge[] = [
  {
    id: "edge-1",
    from: "sleep",
    to: "energy",
    label: "Sleep <-> Energy",
    strength: 72,
    evidence: [
      {
        id: "e-1",
        quote: "Slept well and had a calmer, more focused morning.",
        source: "Entry: Ocean walk reset",
      },
      {
        id: "e-2",
        quote: "After a rough night, the afternoon crash hit hard.",
        source: "Entry: Work storm",
      },
    ],
  },
  {
    id: "edge-2",
    from: "stress",
    to: "edge",
    label: "Stress <-> On edge",
    strength: 66,
    evidence: [
      {
        id: "e-3",
        quote: "Meeting load stacked up and I felt more on edge.",
        source: "Entry: Therapy prep",
      },
      {
        id: "e-4",
        quote: "When stress is high, I notice my shoulders lock up.",
        source: "Entry: Family dinner reflections",
      },
    ],
  },
  {
    id: "edge-3",
    from: "connection",
    to: "focus",
    label: "Connection <-> Focus",
    strength: 54,
    evidence: [
      {
        id: "e-5",
        quote: "A quick check-in with a friend helped me re-center.",
        source: "Entry: Ocean walk reset",
      },
    ],
  },
];

const ConnectionsPage = () => {
  const [selectedEdge, setSelectedEdge] = useState<ConnectionEdge | undefined>(edges[0]);

  return (
    <div className="space-y-8 text-slate-900">
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-lg shadow-brand/10">
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
        onEdgeSelect={setSelectedEdge}
      />
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Supporting evidence</h3>
            <p className="mt-1 text-sm text-slate-500">
              {selectedEdge ? `Quotes for ${selectedEdge.label}.` : "Select a connection to view quotes."}
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
        {selectedEdge ? (
          <div className="mt-6 space-y-4">
            {selectedEdge.evidence.map((evidence) => (
              <div key={evidence.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">“{evidence.quote}”</p>
                <p className="mt-2 text-xs text-slate-400">{evidence.source}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Tap an edge to surface the most relevant quotes.</p>
        )}
      </section>
    </div>
  );
};

export default ConnectionsPage;
