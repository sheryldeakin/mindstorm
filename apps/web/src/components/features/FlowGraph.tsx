import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import * as dagre from "dagre";

export type FlowNode = {
  id: string;
  label: string;
  type: "context" | "symptom" | "impact";
};

export type FlowEdge = {
  from: string;
  to: string;
  weight: number;
  color?: string;
  avgLag?: number;
  sourcePairs?: Array<{ from: string; to: string }>;
};

type FlowGraphProps = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  highlightedNodeIds?: Set<string>;
  highlightedEdgeIds?: Set<string>;
  focusNodeIds?: Set<string>;
  focusEdgeIds?: Set<string>;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edge: FlowEdge) => void;
  className?: string;
};

type LayoutNode = FlowNode & { x: number; y: number };

type LayoutEdge = FlowEdge & { points: Array<{ x: number; y: number }> };

type LayoutResult = {
  layoutNodes: LayoutNode[];
  layoutEdges: LayoutEdge[];
  graphWidth: number;
  graphHeight: number;
};

type GroupBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;
const RANK_SEP = 120;
const NODE_SEP = 32;
const MARGIN_X = 40;
const MARGIN_Y = 40;
const GROUP_PADDING_X = 24;
const GROUP_PADDING_Y = 24;
const PORT_INSET = 8;
const GROUP_LABELS: Record<FlowNode["type"], string> = {
  context: "Influences",
  symptom: "Core experiences",
  impact: "Life impact",
};

const buildLayout = (nodes: FlowNode[], edges: FlowEdge[]): LayoutResult => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: MARGIN_X,
    marginy: MARGIN_Y,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      label: node.label,
      type: node.type,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.from, edge.to, {
      weight: edge.weight,
      color: edge.color,
    });
  });

  dagre.layout(g);

  const layoutNodes = nodes.map((node) => {
    const n = g.node(node.id) as { x: number; y: number } | undefined;
    return {
      ...node,
      x: (n?.x ?? 0) - NODE_WIDTH / 2,
      y: (n?.y ?? 0) - NODE_HEIGHT / 2,
    };
  });

  const layoutEdges = edges.map((edge) => {
    const e = g.edge(edge.from, edge.to) as { points?: Array<{ x: number; y: number }> } | undefined;
    return {
      ...edge,
      points: e?.points ?? [],
    };
  });

  const graphData = g.graph();
  return {
    layoutNodes,
    layoutEdges,
    graphWidth: graphData.width ?? 0,
    graphHeight: graphData.height ?? 0,
  };
};

const normalizeLabel = (label: string) => label.trim().replace(/\s+/g, " ").toLowerCase();

const edgeKey = (from: string, to: string) => `${from}->${to}`;

const parseEdgeKey = (value: string) => {
  const arrowIndex = value.indexOf("->");
  if (arrowIndex >= 0) {
    return [value.slice(0, arrowIndex), value.slice(arrowIndex + 2)] as const;
  }
  const dashIndex = value.indexOf("-");
  if (dashIndex >= 0) {
    return [value.slice(0, dashIndex), value.slice(dashIndex + 1)] as const;
  }
  return null;
};

const pathFromPoints = (points: Array<{ x: number; y: number }>) => {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
};

const FlowGraph = ({
  nodes,
  edges,
  highlightedNodeIds,
  highlightedEdgeIds,
  focusNodeIds,
  focusEdgeIds,
  onNodeClick,
  onEdgeClick,
  className,
}: FlowGraphProps) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { graphNodes, idToCanonical } = useMemo(() => {
    const keyToNode = new Map<string, FlowNode>();
    const canonical = new Map<string, string>();

    nodes.forEach((node) => {
      const key = `${node.type}:${normalizeLabel(node.label)}`;
      const existing = keyToNode.get(key);
      if (!existing) {
        keyToNode.set(key, node);
        canonical.set(node.id, node.id);
        return;
      }
      canonical.set(node.id, existing.id);
      if (node.label.trim().length < existing.label.trim().length) {
        keyToNode.set(key, { ...existing, label: node.label });
      }
    });

    return { graphNodes: Array.from(keyToNode.values()), idToCanonical: canonical };
  }, [nodes]);

  const graphEdges = useMemo(() => {
    const merged = new Map<string, FlowEdge>();
    edges.forEach((edge) => {
      const mappedFrom = idToCanonical.get(edge.from) ?? edge.from;
      const mappedTo = idToCanonical.get(edge.to) ?? edge.to;
      if (mappedFrom === mappedTo) return;

      const key = edgeKey(mappedFrom, mappedTo);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...edge,
          from: mappedFrom,
          to: mappedTo,
          sourcePairs: [{ from: edge.from, to: edge.to }],
        });
        return;
      }

      const nextWeight = existing.weight + edge.weight;
      let nextAvgLag = existing.avgLag;
      if (existing.avgLag != null && edge.avgLag != null) {
        nextAvgLag = (existing.avgLag * existing.weight + edge.avgLag * edge.weight) / nextWeight;
      } else if (existing.avgLag == null && edge.avgLag != null) {
        nextAvgLag = edge.avgLag;
      }

      const sourcePairs = existing.sourcePairs ? [...existing.sourcePairs] : [];
      const sourceKey = edgeKey(edge.from, edge.to);
      if (!sourcePairs.some((pair) => edgeKey(pair.from, pair.to) === sourceKey)) {
        sourcePairs.push({ from: edge.from, to: edge.to });
      }

      merged.set(key, {
        ...existing,
        weight: nextWeight,
        avgLag: nextAvgLag,
        color: existing.color ?? edge.color,
        sourcePairs,
      });
    });
    return Array.from(merged.values());
  }, [edges, idToCanonical]);

  const layout = useMemo(() => buildLayout(graphNodes, graphEdges), [graphNodes, graphEdges]);
  const nodeById = useMemo(
    () => new Map(layout.layoutNodes.map((node) => [node.id, node])),
    [layout.layoutNodes],
  );

  const groupBounds = useMemo(() => {
    const bounds: Partial<Record<FlowNode["type"], GroupBounds>> = {};
    (["context", "symptom", "impact"] as const).forEach((type) => {
      const groupNodes = layout.layoutNodes.filter((node) => node.type === type);
      if (!groupNodes.length) return;
      const minX = Math.min(...groupNodes.map((node) => node.x));
      const minY = Math.min(...groupNodes.map((node) => node.y));
      const maxX = Math.max(...groupNodes.map((node) => node.x + NODE_WIDTH));
      const maxY = Math.max(...groupNodes.map((node) => node.y + NODE_HEIGHT));
      bounds[type] = {
        x: minX - GROUP_PADDING_X,
        y: minY - GROUP_PADDING_Y,
        width: maxX - minX + GROUP_PADDING_X * 2,
        height: maxY - minY + GROUP_PADDING_Y * 2,
      };
    });
    return bounds;
  }, [layout.layoutNodes]);

  const portEdges = useMemo(() => {
    const outgoing = new Map<string, LayoutEdge[]>();
    const incoming = new Map<string, LayoutEdge[]>();

    layout.layoutEdges.forEach((edge) => {
      if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
      outgoing.get(edge.from)?.push(edge);
      if (!incoming.has(edge.to)) incoming.set(edge.to, []);
      incoming.get(edge.to)?.push(edge);
    });

    const getNodeCenterY = (nodeId: string) => {
      const node = nodeById.get(nodeId);
      return node ? node.y + NODE_HEIGHT / 2 : 0;
    };

    outgoing.forEach((edgesForNode) => {
      edgesForNode.sort((a, b) => getNodeCenterY(a.to) - getNodeCenterY(b.to));
    });
    incoming.forEach((edgesForNode) => {
      edgesForNode.sort((a, b) => getNodeCenterY(a.from) - getNodeCenterY(b.from));
    });

    const getPortY = (nodeId: string, list: LayoutEdge[] | undefined, key: string) => {
      const node = nodeById.get(nodeId);
      if (!node) return 0;
      if (!list || list.length <= 1) return node.y + NODE_HEIGHT / 2;
      const index = list.findIndex((edge) => edgeKey(edge.from, edge.to) === key);
      if (index < 0) return node.y + NODE_HEIGHT / 2;
      const span = Math.max(0, NODE_HEIGHT - PORT_INSET * 2);
      const step = list.length > 1 ? span / (list.length - 1) : 0;
      return node.y + PORT_INSET + step * index;
    };

    return layout.layoutEdges.map((edge) => {
      const fromNode = nodeById.get(edge.from);
      const toNode = nodeById.get(edge.to);
      if (!fromNode || !toNode) return edge;

      const key = edgeKey(edge.from, edge.to);
      const forward = fromNode.x <= toNode.x;
      const startX = forward ? fromNode.x + NODE_WIDTH : fromNode.x;
      const endX = forward ? toNode.x : toNode.x + NODE_WIDTH;
      const startY = getPortY(edge.from, outgoing.get(edge.from), key);
      const endY = getPortY(edge.to, incoming.get(edge.to), key);

      const points = edge.points.length
        ? [...edge.points]
        : [
            { x: startX, y: startY },
            { x: endX, y: endY },
          ];
      points[0] = { x: startX, y: startY };
      points[points.length - 1] = { x: endX, y: endY };
      return { ...edge, points };
    });
  }, [layout.layoutEdges, nodeById]);

  const layoutBounds = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    const push = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    layout.layoutNodes.forEach((node) => {
      push(node.x, node.y);
      push(node.x + NODE_WIDTH, node.y + NODE_HEIGHT);
    });

    portEdges.forEach((edge) => {
      edge.points.forEach((point) => {
        push(point.x, point.y);
      });
    });

    Object.values(groupBounds).forEach((bounds) => {
      if (!bounds) return;
      push(bounds.x, bounds.y);
      push(bounds.x + bounds.width, bounds.y + bounds.height);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    return { minX, minY, maxX, maxY };
  }, [layout.layoutNodes, portEdges, groupBounds]);

  const offsetX = layoutBounds.minX < 0 ? -layoutBounds.minX : 0;
  const offsetY = layoutBounds.minY < 0 ? -layoutBounds.minY : 0;

  const renderNodes = useMemo(
    () =>
      layout.layoutNodes.map((node) => ({
        ...node,
        x: node.x + offsetX,
        y: node.y + offsetY,
      })),
    [layout.layoutNodes, offsetX, offsetY],
  );

  const renderEdges = useMemo(
    () =>
      portEdges.map((edge) => ({
        ...edge,
        points: edge.points.map((point) => ({
          x: point.x + offsetX,
          y: point.y + offsetY,
        })),
      })),
    [portEdges, offsetX, offsetY],
  );

  const renderGroups = useMemo(() => {
    const entries = Object.entries(groupBounds) as Array<[FlowNode["type"], GroupBounds]>;
    const result: Partial<Record<FlowNode["type"], GroupBounds>> = {};
    entries.forEach(([type, bounds]) => {
      if (!bounds) return;
      result[type] = {
        x: bounds.x + offsetX,
        y: bounds.y + offsetY,
        width: bounds.width,
        height: bounds.height,
      };
    });
    return result;
  }, [groupBounds, offsetX, offsetY]);

  const highlightState = useMemo(() => {
    if (!selectedNode) {
      return {
        dimmed: false,
        nodes: new Set(graphNodes.map((node) => node.id)),
        edges: new Set(graphEdges.map((edge) => edgeKey(edge.from, edge.to))),
      };
    }

    const relatedNodes = new Set<string>([selectedNode]);
    const relatedEdges = new Set<string>();
    graphEdges.forEach((edge) => {
      if (edge.from === selectedNode || edge.to === selectedNode) {
        relatedNodes.add(edge.from);
        relatedNodes.add(edge.to);
        relatedEdges.add(edgeKey(edge.from, edge.to));
      }
    });

    return { dimmed: true, nodes: relatedNodes, edges: relatedEdges };
  }, [selectedNode, nodes, edges]);

  const useExternalHighlight =
    highlightedNodeIds || highlightedEdgeIds || focusNodeIds || focusEdgeIds ? true : false;

  const mappedHighlightedNodeIds = useMemo(() => {
    if (!highlightedNodeIds) return undefined;
    const mapped = new Set<string>();
    highlightedNodeIds.forEach((id) => mapped.add(idToCanonical.get(id) ?? id));
    return mapped;
  }, [highlightedNodeIds, idToCanonical]);

  const mappedFocusNodeIds = useMemo(() => {
    if (!focusNodeIds) return undefined;
    const mapped = new Set<string>();
    focusNodeIds.forEach((id) => mapped.add(idToCanonical.get(id) ?? id));
    return mapped;
  }, [focusNodeIds, idToCanonical]);

  const mapEdgeSet = (edgeIds?: Set<string>) => {
    if (!edgeIds) return undefined;
    const mapped = new Set<string>();
    edgeIds.forEach((value) => {
      const parsed = parseEdgeKey(value);
      if (!parsed) return;
      const [from, to] = parsed;
      const mappedFrom = idToCanonical.get(from) ?? from;
      const mappedTo = idToCanonical.get(to) ?? to;
      if (mappedFrom === mappedTo) return;
      mapped.add(edgeKey(mappedFrom, mappedTo));
    });
    return mapped;
  };

  const mappedHighlightedEdgeIds = useMemo(
    () => mapEdgeSet(highlightedEdgeIds),
    [highlightedEdgeIds, idToCanonical],
  );

  const mappedFocusEdgeIds = useMemo(() => mapEdgeSet(focusEdgeIds), [focusEdgeIds, idToCanonical]);

  const activeHighlight = useMemo(() => {
    if (!useExternalHighlight) return highlightState;
    const hasFocus =
      (mappedFocusNodeIds && mappedFocusNodeIds.size > 0) ||
      (mappedFocusEdgeIds && mappedFocusEdgeIds.size > 0);
    return {
      dimmed: !!hasFocus,
      nodes: mappedHighlightedNodeIds ?? new Set(graphNodes.map((node) => node.id)),
      edges: mappedHighlightedEdgeIds ?? new Set(graphEdges.map((edge) => edgeKey(edge.from, edge.to))),
    };
  }, [
    useExternalHighlight,
    highlightState,
    mappedFocusNodeIds,
    mappedFocusEdgeIds,
    mappedHighlightedNodeIds,
    mappedHighlightedEdgeIds,
    graphNodes,
    graphEdges,
  ]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleNodeClick = (nodeId: string) => {
    if (!useExternalHighlight) {
      setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
    }
    onNodeClick?.(nodeId);
  };

  const innerWidth = Math.max(layoutBounds.maxX + offsetX, NODE_WIDTH);
  const innerHeight = Math.max(layoutBounds.maxY + offsetY, NODE_HEIGHT);
  const availableWidth = Math.max(1, containerWidth - 48);
  const scale = containerWidth ? Math.min(1, availableWidth / innerWidth) : 1;
  const scaledWidth = Math.ceil(innerWidth * scale);
  const scaledHeight = Math.ceil(innerHeight * scale);
  const containerHeight = Math.max(600, scaledHeight + 48);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full max-w-full min-w-0 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/30 p-6 shadow-inner",
        className,
      )}
      style={{ minHeight: containerHeight }}
    >
      <div
        className="relative"
        style={{
          width: scaledWidth,
          height: scaledHeight,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: innerWidth,
            height: innerHeight,
            transform: `scale(${scale})`,
          }}
        >
          {(["context", "symptom", "impact"] as const).map((type) => {
            const bounds = renderGroups[type];
            if (!bounds) return null;
            return (
              <div
                key={type}
                className={clsx(
                  "pointer-events-none absolute rounded-3xl border transition-all duration-300 z-0",
                  type === "context" && "bg-slate-100/60 border-slate-200/60",
                  type === "symptom" && "bg-white/80 border-slate-200 shadow-sm",
                  type === "impact" && "bg-orange-50/40 border-orange-100/50",
                )}
                style={{
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                }}
              >
                <div className="absolute left-0 top-0 w-full px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">
                  {GROUP_LABELS[type]}
                </div>
              </div>
            );
          })}

          <svg className="absolute inset-0 h-full w-full overflow-visible z-10">
            <defs>
              <marker
                id="flow-arrow-base"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="2.5"
                markerHeight="2.5"
                markerUnits="strokeWidth"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
              <marker
                id="flow-arrow-active"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="2.5"
                markerHeight="2.5"
                markerUnits="strokeWidth"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            {renderEdges.map((edge) => {
              const key = edgeKey(edge.from, edge.to);
              const isHighlighted = activeHighlight.edges.has(key);
              const isDimmed = activeHighlight.dimmed && !isHighlighted;
              const strokeWidth = Math.max(1.5, Math.min(4, edge.weight));
              const d = pathFromPoints(edge.points);
              if (!d) return null;
              return (
                <g key={key}>
                  <path
                    d={d}
                    stroke="transparent"
                    strokeWidth={Math.max(10, strokeWidth + 6)}
                    fill="none"
                    onClick={() => onEdgeClick?.(edge)}
                    pointerEvents="stroke"
                    markerEnd={`url(#flow-arrow-${isHighlighted ? "active" : "base"})`}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={isHighlighted ? "#6366f1" : edge.color || "#94a3b8"}
                    strokeWidth={isHighlighted ? 3 : strokeWidth}
                    strokeLinecap="round"
                    className={clsx("transition-all duration-300", isDimmed ? "opacity-10" : "opacity-70")}
                    markerEnd={`url(#flow-arrow-${isHighlighted ? "active" : "base"})`}
                  />
                </g>
              );
            })}
        </svg>

        {renderNodes.map((node) => {
          const isHighlighted = activeHighlight.nodes.has(node.id);
          const isDimmed = activeHighlight.dimmed && !isHighlighted;
          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={clsx(
                "absolute z-20 flex items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-medium shadow-sm transition-all",
                node.type === "context" && "bg-slate-50 border-slate-200 text-slate-700",
                node.type === "symptom" && "bg-white border-indigo-100 text-indigo-700",
                node.type === "impact" && "bg-orange-50/70 border-orange-100 text-orange-800",
                isDimmed && "opacity-30",
                isHighlighted && "ring-2 ring-brand ring-offset-2 scale-105",
                )}
                style={{
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  left: node.x,
                  top: node.y,
                }}
              >
                {node.type !== "context" && (
                  <div className="absolute left-0 top-1/2 h-3 w-1.5 -translate-x-1.5 -translate-y-1/2 rounded-r-full bg-slate-300" />
                )}
                <span className="line-clamp-3 text-xs font-semibold leading-tight">{node.label}</span>
                {node.type !== "impact" && (
                  <div className="absolute right-0 top-1/2 h-3 w-1.5 translate-x-1.5 -translate-y-1/2 rounded-l-full bg-slate-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FlowGraph;
