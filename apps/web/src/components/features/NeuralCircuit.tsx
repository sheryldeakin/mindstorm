import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGraphPathfinding, type GraphPath } from "../../hooks/useGraphPathfinding";

export type NeuralCircuitNode = {
  id: string;
  label: string;
  kind: "symptom" | "context" | "impact";
};

export type NeuralCircuitEdge = {
  from: string;
  to: string;
  weight?: number;
};

type NeuralCircuitProps = {
  nodes: NeuralCircuitNode[];
  edges: NeuralCircuitEdge[];
  selection?: { start: string | null; end: string | null };
  activePath?: GraphPath | null;
  onNodeClick?: (id: string) => void;
  showPanel?: boolean;
};

type LayoutPoint = { x: number; y: number };

type LayoutMap = Map<string, LayoutPoint>;

const NODE_RADIUS = 16;
const BASE_RING = 150;
const OUTER_RING = 210;
const DIM_OPACITY = 0.25;

const hashToOffset = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997;
  }
  return (hash / 997) * 2 - 1;
};

const getBaseLayout = (nodes: NeuralCircuitNode[]): LayoutMap => {
  const map = new Map<string, LayoutPoint>();
  const count = Math.max(nodes.length, 1);
  nodes.forEach((node, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const jitter = hashToOffset(node.id);
    const radius = BASE_RING + jitter * 22;
    map.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });
  return map;
};

const getFocusedLayout = (nodes: NeuralCircuitNode[], selected: string[]): LayoutMap => {
  const base = getBaseLayout(nodes);
  if (selected.length === 0) return base;

  const map = new Map(base);
  const [first, second] = selected;
  if (first) {
    map.set(first, { x: -60, y: 0 });
  }
  if (second) {
    map.set(second, { x: 60, y: 0 });
  }

  nodes.forEach((node, index) => {
    if (selected.includes(node.id)) return;
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    map.set(node.id, {
      x: Math.cos(angle) * OUTER_RING,
      y: Math.sin(angle) * OUTER_RING,
    });
  });

  return map;
};

const pathIncludesEdge = (path: GraphPath, edge: NeuralCircuitEdge) => {
  for (let i = 0; i < path.length - 1; i += 1) {
    if (path[i] === edge.from && path[i + 1] === edge.to) return true;
  }
  return false;
};

const trimLine = (from: LayoutPoint, to: LayoutPoint, trimEnd: number, trimStart = 0) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: from.x + ux * trimStart,
    y1: from.y + uy * trimStart,
    x2: to.x - ux * trimEnd,
    y2: to.y - uy * trimEnd,
  };
};

const nodeMatchesPath = (path: GraphPath | null, nodeId: string) => {
  if (!path) return true;
  return path.includes(nodeId);
};

const kindStyle = (kind: NeuralCircuitNode["kind"]) => {
  if (kind === "context") return "fill-slate-200 text-slate-700";
  if (kind === "impact") return "fill-amber-200 text-amber-800";
  return "fill-indigo-200 text-indigo-800";
};

const useLayout = (nodes: NeuralCircuitNode[], selected: string[]) =>
  useMemo(() => getFocusedLayout(nodes, selected), [nodes, selected]);

const NeuralCircuit = ({
  nodes,
  edges,
  selection,
  activePath,
  onNodeClick,
  showPanel = true,
}: NeuralCircuitProps) => {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [highlightedPath, setHighlightedPath] = useState<GraphPath | null>(null);
  const { findCyclesForNode, findPathsBetween } = useGraphPathfinding(edges);

  const isControlled = Boolean(selection || activePath || onNodeClick);
  const effectiveSelectedNodes = selection
    ? ([selection.start, selection.end].filter(Boolean) as string[])
    : selectedNodes;
  const effectivePath = activePath ?? highlightedPath;
  const layout = useLayout(nodes, effectiveSelectedNodes);
  const highlightedKey = effectivePath ? effectivePath.join("->") : null;
  const renderPanel = showPanel && !isControlled;

  const results = useMemo(() => {
    if (effectiveSelectedNodes.length === 1) {
      const cycles = findCyclesForNode(effectiveSelectedNodes[0]);
      return { type: "cycles" as const, items: cycles };
    }
    if (effectiveSelectedNodes.length === 2) {
      const paths = findPathsBetween(effectiveSelectedNodes[0], effectiveSelectedNodes[1]);
      return { type: "paths" as const, items: paths };
    }
    return { type: "none" as const, items: [] as GraphPath[] };
  }, [effectiveSelectedNodes, findCyclesForNode, findPathsBetween]);

  const handleNodeClick = (id: string) => {
    if (onNodeClick) {
      onNodeClick(id);
      return;
    }
    setSelectedNodes((prev) => {
      if (prev.includes(id)) return [];
      if (prev.length === 1) return [prev[0], id];
      return [id];
    });
    setHighlightedPath(null);
  };

  const titleCopy =
    effectiveSelectedNodes.length === 0
      ? "Network Explorer"
      : effectiveSelectedNodes.length === 1
        ? "Node Cycles"
        : "Pathfinder";

  const subtitleCopy =
    effectiveSelectedNodes.length === 0
      ? "Click a node to surface its feedback loops."
      : effectiveSelectedNodes.length === 1
        ? `Found ${results.items.length} cycles.`
        : `Found ${results.items.length} paths between nodes.`;

  const containerClass = renderPanel
    ? "grid gap-6 rounded-[32px] border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur lg:grid-cols-[minmax(0,1fr)_320px]"
    : "rounded-[32px] border border-slate-200 bg-white/60 p-6 shadow-sm backdrop-blur";

  return (
    <section className={containerClass}>
      <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2ff_45%,_#e2e8f0_100%)]">
        <svg viewBox="-260 -260 520 520" className="h-full w-full">
          {/* Edges are intentionally hidden; the active dotted path is the only visible connection. */}

          {effectivePath && (
            <motion.path
              d={effectivePath
                .map((nodeId, idx) => {
                  const point = layout.get(nodeId);
                  if (!point) return "";
                  return `${idx === 0 ? "M" : "L"} ${point.x} ${point.y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#6366f1"
              strokeWidth={3}
              strokeDasharray="6 6"
              animate={{ strokeDashoffset: [24, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}

          {nodes.map((node) => {
            const point = layout.get(node.id);
            if (!point) return null;
            const isSelected = effectiveSelectedNodes.includes(node.id);
            const isVisible = nodeMatchesPath(effectivePath ?? null, node.id);
            return (
              <motion.g
                key={node.id}
                initial={false}
                animate={{
                  x: point.x,
                  y: point.y,
                  opacity: isVisible ? 1 : DIM_OPACITY,
                }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              >
                <motion.circle
                  r={NODE_RADIUS}
                  className={`${kindStyle(node.kind)} ${isSelected ? "stroke-indigo-600" : "stroke-white"}`}
                  strokeWidth={isSelected ? 3 : 2}
                  onClick={() => handleNodeClick(node.id)}
                  style={{ cursor: "pointer" }}
                />
                <foreignObject x={-60} y={NODE_RADIUS + 6} width={120} height={40}>
                  <div className="text-center text-[11px] font-semibold text-slate-700">
                    {node.label}
                  </div>
                </foreignObject>
              </motion.g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          Active Neural Circuit
        </div>
      </div>

      {renderPanel ? (
        <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">{titleCopy}</h3>
          <p className="mt-1 text-xs text-slate-500">{subtitleCopy}</p>
          {effectiveSelectedNodes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
              {effectiveSelectedNodes.map((nodeId) => (
                <span key={nodeId} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                  {nodes.find((node) => node.id === nodeId)?.label ?? nodeId}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {results.items.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500"
              >
                Select a node to explore its loops or pick two nodes to map paths.
              </motion.div>
            ) : (
              results.items.map((path, idx) => {
                const key = `${path.join("->")}-${idx}`;
                const pathKey = path.join("->");
                const isActive = highlightedKey === pathKey;
                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    type="button"
                    onClick={() => setHighlightedPath(path)}
                    className={`w-full rounded-2xl border p-3 text-left text-xs transition-all ${
                      isActive
                        ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                    }`}
                  >
                    <div className="font-semibold">Option {idx + 1}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      {path.map((nodeId, index) => (
                        <span key={`${nodeId}-${index}`} className="flex items-center">
                          {index > 0 && <span className="mx-1 text-slate-300">→</span>}
                          {nodes.find((node) => node.id === nodeId)?.label ?? nodeId}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
      ) : null}
    </section>
  );
};

export default NeuralCircuit;
