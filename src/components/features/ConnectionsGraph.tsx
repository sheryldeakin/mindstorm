import type { ConnectionEdge, ConnectionNode } from "../../types/connections";

interface ConnectionsGraphProps {
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
  onEdgeSelect: (edge: ConnectionEdge) => void;
  selectedEdgeId?: string;
}

const ConnectionsGraph = ({ nodes, edges, onEdgeSelect, selectedEdgeId }: ConnectionsGraphProps) => (
  <div className="rounded-3xl border border-brand/15 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-xl font-semibold">Connections map</h3>
        <p className="mt-1 text-sm text-slate-500">Patient-friendly links between signals.</p>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tap an edge</p>
    </div>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
        <span>Map view</span>
        <span>Placeholder</span>
      </div>
      <div className="relative mt-4 h-72 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.08),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(14,116,144,0.08),transparent_40%)]" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 300">
          <line x1="120" y1="70" x2="280" y2="140" stroke="rgba(99,102,241,0.4)" strokeWidth="2" />
          <line x1="280" y1="140" x2="430" y2="70" stroke="rgba(99,102,241,0.4)" strokeWidth="2" />
          <line x1="280" y1="140" x2="420" y2="220" stroke="rgba(14,116,144,0.35)" strokeWidth="2" />
          <line x1="120" y1="70" x2="170" y2="210" stroke="rgba(16,185,129,0.35)" strokeWidth="2" />
        </svg>
        <div className="absolute left-10 top-10 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          Sleep
        </div>
        <div className="absolute left-44 top-24 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          Energy
        </div>
        <div className="absolute right-16 top-10 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          Stress
        </div>
        <div className="absolute left-20 bottom-12 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          Focus
        </div>
        <div className="absolute right-20 bottom-16 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
          On edge
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {nodes.map((node) => (
          <span
            key={node.id}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
          >
            {node.label}
          </span>
        ))}
      </div>
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">What influences this</p>
        <p className="mt-1 text-xs text-slate-400">Select a connection to view evidence.</p>
        <div className="mt-4 space-y-2">
          {edges.map((edge) => (
            <button
              key={edge.id}
              type="button"
              onClick={() => onEdgeSelect(edge)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                selectedEdgeId === edge.id
                  ? "border-brand/40 bg-brand/5 text-brand"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand/30"
              }`}
            >
              <span>{edge.label}</span>
              <span className="text-xs text-slate-400">{edge.strength}%</span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">Connection strength</p>
        <div className="mt-4 space-y-3">
          {edges.map((edge) => (
            <div key={edge.id}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{edge.label}</span>
                <span>{edge.strength}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-sky-400"
                  style={{ width: `${edge.strength}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default ConnectionsGraph;
