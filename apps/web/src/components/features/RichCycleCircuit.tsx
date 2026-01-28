import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export type CycleEdgeDetail = {
  from: string;
  to: string;
  confidence: number;
  lagText: string;
  weight: number;
};

type RichCycleCircuitProps = {
  cycleNodes: { id: string; label: string; kind: "context" | "symptom" | "impact" }[];
  edges: CycleEdgeDetail[];
  inputs: { id: string; label: string }[];
  outputs: { id: string; label: string }[];
  onEdgeClick?: (from: string, to: string) => void;
};

const RADIUS = 160;
const NODE_SIZE = 100;

const RichCycleCircuit = ({ cycleNodes, edges, inputs, outputs, onEdgeClick }: RichCycleCircuitProps) => {
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);

  const positions = useMemo(
    () =>
      cycleNodes.map((node, i) => {
        const angle = (i / cycleNodes.length) * 2 * Math.PI - Math.PI / 2;
        return {
          ...node,
          x: RADIUS * Math.cos(angle),
          y: RADIUS * Math.sin(angle),
          angle,
        };
      }),
    [cycleNodes],
  );

  const getArcPath = (startIdx: number, endIdx: number) => {
    const start = positions[startIdx];
    const end = positions[endIdx];
    return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
  };

  const getMidpoint = (startIdx: number, endIdx: number) => {
    const startAngle = positions[startIdx].angle;
    let endAngle = positions[endIdx].angle;
    if (endAngle < startAngle) endAngle += Math.PI * 2;

    const midAngle = (startAngle + endAngle) / 2;
    return {
      x: RADIUS * Math.cos(midAngle),
      y: RADIUS * Math.sin(midAngle),
      rotation: (midAngle * 180) / Math.PI + 90,
    };
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex flex-wrap justify-center gap-2">
        {inputs.length ? (
          inputs.map((input) => (
            <span
              key={input.id}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
            >
              {input.label} <span className="text-slate-400">→</span>
            </span>
          ))
        ) : (
          <span className="text-xs italic text-slate-400">No external triggers detected</span>
        )}
      </div>

      <div className="relative" style={{ width: RADIUS * 2 + 100, height: RADIUS * 2 + 100 }}>
        <svg
          viewBox={`-${RADIUS + 60} -${RADIUS + 60} ${(RADIUS + 60) * 2} ${(RADIUS + 60) * 2}`}
          className="h-full w-full overflow-visible"
        >
          <defs>
            <marker id="arrow-head" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 L0,0" fill="#94a3b8" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const startIdx = cycleNodes.findIndex((node) => node.id === edge.from);
            const endIdx = cycleNodes.findIndex((node) => node.id === edge.to);
            if (startIdx === -1 || endIdx === -1) return null;

            const path = getArcPath(startIdx, endIdx);
            const mid = getMidpoint(startIdx, endIdx);
            const isHovered = hoveredEdge === `${edge.from}-${edge.to}`;
            const strokeWidth = 2 + edge.confidence * 4;
            const opacity = 0.4 + edge.confidence * 0.6;

            return (
              <g
                key={`${edge.from}-${edge.to}`}
                onClick={() => onEdgeClick?.(edge.from, edge.to)}
                onMouseEnter={() => setHoveredEdge(`${edge.from}-${edge.to}`)}
                onMouseLeave={() => setHoveredEdge(null)}
                className="cursor-pointer transition-all duration-300"
              >
                <motion.path
                  d={path}
                  fill="none"
                  stroke={isHovered ? "#6366f1" : "#94a3b8"}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  markerEnd="url(#arrow-head)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.2 }}
                />

                <g transform={`translate(${mid.x}, ${mid.y}) rotate(${mid.rotation})`}>
                  <rect
                    x="-24"
                    y="-10"
                    width="48"
                    height="20"
                    rx="10"
                    fill="white"
                    stroke={isHovered ? "#6366f1" : "#e2e8f0"}
                    className="transition-colors"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    className="fill-slate-500 text-[9px] font-semibold"
                    style={{ pointerEvents: "none" }}
                  >
                    {edge.lagText}
                  </text>
                </g>
              </g>
            );
          })}

          {positions.map((node) => (
            <foreignObject key={node.id} x={node.x - NODE_SIZE / 2} y={node.y - 20} width={NODE_SIZE} height={50}>
              <div
                className={clsx(
                  "flex items-center justify-center rounded-xl border bg-white p-2 text-center text-xs font-bold shadow-sm transition-transform hover:scale-105",
                  node.kind === "context" && "border-slate-200 text-slate-700",
                  node.kind === "symptom" && "border-indigo-100 text-indigo-700",
                  node.kind === "impact" && "border-orange-100 text-orange-700",
                )}
              >
                {node.label}
              </div>
            </foreignObject>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {outputs.length ? (
          outputs.map((output) => (
            <span
              key={output.id}
              className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs text-amber-800"
            >
              <span className="text-amber-400">→</span> {output.label}
            </span>
          ))
        ) : (
          <span className="text-xs italic text-slate-400">No downstream impact detected</span>
        )}
      </div>
    </div>
  );
};

export default RichCycleCircuit;
