import type { ConnectionEdge, ConnectionNode } from "../../types/connections";

interface ConnectionsGraphProps {
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
  onEdgeSelect: (edge: ConnectionEdge) => void;
  selectedEdgeId?: string;
  loading?: boolean;
  emptyState?: boolean;
}

const ConnectionsGraph = ({
  nodes,
  edges,
  onEdgeSelect,
  selectedEdgeId,
  loading,
  emptyState,
}: ConnectionsGraphProps) => {
  const width = 640;
  const height = 320;
  const radius = 120;
  const centerX = width / 2;
  const centerY = height / 2;
  const positions = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
  const positionMap = new Map(positions.map((node) => [node.id, node]));

  return (
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
          <span>{loading ? "Loading" : "Live"}</span>
        </div>
        <div className="relative mt-4 h-72 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.08),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(14,116,144,0.08),transparent_40%)]" />
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Building your connections map...
            </div>
          ) : emptyState ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Add more entries to generate connections.
            </div>
          ) : (
            <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`}>
              {edges.map((edge) => {
                const from = positionMap.get(edge.from);
                const to = positionMap.get(edge.to);
                if (!from || !to) return null;
                const isSelected = edge.id === selectedEdgeId;
                return (
                  <g key={edge.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="transparent"
                      strokeWidth={18}
                      strokeLinecap="round"
                      onClick={() => onEdgeSelect(edge)}
                      className="cursor-pointer"
                    />
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={isSelected ? "rgba(59,130,246,0.6)" : "rgba(99,102,241,0.35)"}
                      strokeWidth={Math.max(1.5, edge.strength / 40)}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
              {positions.map((node) => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r={22} fill="#fff" stroke="rgba(148,163,184,0.7)" />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-semibold"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          )}
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
            {edges.length ? (
              edges.map((edge) => (
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
              ))
            ) : (
              <p className="text-sm text-slate-500">No connections yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Connection strength</p>
          <div className="mt-4 space-y-3">
            {edges.length ? (
              edges.map((edge) => (
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
              ))
            ) : (
              <p className="text-sm text-slate-500">No strengths to display yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionsGraph;
