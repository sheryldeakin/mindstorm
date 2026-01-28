import { useMemo } from "react";
import { motion } from "framer-motion";

type Node = { id: string; label: string; kind: "symptom" | "context" | "impact" };
type Attachment = { id: string; label: string; linkedNodeId: string };

type OrbitalCycleProps = {
  cycleNodes: Node[];
  inputs: Attachment[];
  outputs: Attachment[];
  highlightedPath?: string[];
  onNodeClick: (id: string) => void;
  selection: { start: string | null; end: string | null };
};

const INNER_RADIUS = 120;
const OUTER_RADIUS = 200;

const OrbitalCycle = ({
  cycleNodes,
  inputs,
  outputs,
  highlightedPath,
  onNodeClick,
  selection,
}: OrbitalCycleProps) => {
  const cycleLayout = useMemo(
    () =>
      cycleNodes.map((node, i) => {
        const angle = (i / cycleNodes.length) * 2 * Math.PI - Math.PI / 2;
        return {
          ...node,
          x: INNER_RADIUS * Math.cos(angle),
          y: INNER_RADIUS * Math.sin(angle),
          angle,
        };
      }),
    [cycleNodes],
  );

  const nodeMap = useMemo(() => new Map(cycleLayout.map((node) => [node.id, node])), [cycleLayout]);

  const getOrbitalPos = (linkedNodeId: string, offsetIndex: number, total: number) => {
    const parent = nodeMap.get(linkedNodeId);
    if (!parent) return { x: 0, y: 0 };

    const spread = 0.5;
    const offset = total > 1 ? (offsetIndex / (total - 1)) * spread - spread / 2 : 0;
    const finalAngle = parent.angle + offset;

    return {
      x: OUTER_RADIUS * Math.cos(finalAngle),
      y: OUTER_RADIUS * Math.sin(finalAngle),
    };
  };

  return (
    <div className="relative flex h-[600px] w-full items-center justify-center overflow-visible">
      <svg viewBox="-250 -250 500 500" className="h-full w-full overflow-visible">
        <defs>
          <marker id="orbital-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L6,3 z" fill="#cbd5e1" />
          </marker>
          <marker
            id="orbital-arrow-active"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" />
          </marker>
        </defs>

        {cycleLayout.map((node, i) => {
          const next = cycleLayout[(i + 1) % cycleLayout.length];
          const isHighlighted = highlightedPath
            ? highlightedPath.includes(node.id) && highlightedPath.includes(next.id)
            : true;

          return (
            <motion.path
              key={`${node.id}-${next.id}`}
              d={`M ${node.x} ${node.y} A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 1 ${next.x} ${next.y}`}
              fill="none"
              stroke={isHighlighted ? "#6366f1" : "#e2e8f0"}
              strokeWidth={isHighlighted ? 3 : 2}
              markerMid={isHighlighted ? "url(#orbital-arrow-active)" : "url(#orbital-arrow)"}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          );
        })}

        {inputs.map((input, i) => {
          const target = nodeMap.get(input.linkedNodeId);
          if (!target) return null;
          const pos = getOrbitalPos(input.linkedNodeId, i, inputs.length);
          return (
            <line
              key={`in-${input.id}-${i}`}
              x1={pos.x}
              y1={pos.y}
              x2={target.x}
              y2={target.y}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 2"
              markerEnd="url(#orbital-arrow)"
            />
          );
        })}

        {outputs.map((output, i) => {
          const source = nodeMap.get(output.linkedNodeId);
          if (!source) return null;
          const pos = getOrbitalPos(output.linkedNodeId, i, outputs.length);
          return (
            <line
              key={`out-${output.id}-${i}`}
              x1={source.x}
              y1={source.y}
              x2={pos.x}
              y2={pos.y}
              stroke="#fb923c"
              strokeWidth="1"
              strokeDasharray="4 2"
              markerEnd="url(#orbital-arrow)"
            />
          );
        })}

        {(() => {
          const seen = new Map<string, number>();
          return inputs.map((input, i) => {
            const pos = getOrbitalPos(input.linkedNodeId, i, inputs.length);
            const count = seen.get(input.id) ?? 0;
            seen.set(input.id, count + 1);
            const key = count === 0 ? input.id : `${input.id}-${count}`;
            return (
              <foreignObject key={key} x={pos.x - 40} y={pos.y - 15} width={80} height={30}>
                <div className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-bold text-slate-500 shadow-sm">
                  {input.label}
                </div>
              </foreignObject>
            );
          });
        })()}

        {cycleLayout.map((node) => {
          const isActive = selection.start === node.id || selection.end === node.id;
          return (
            <foreignObject key={node.id} x={node.x - 50} y={node.y - 20} width={100} height={40}>
              <button
                type="button"
                onClick={() => onNodeClick(node.id)}
                className={`flex h-full w-full items-center justify-center rounded-xl border text-xs font-bold shadow-sm transition-all ${
                  isActive
                    ? "scale-110 border-indigo-700 bg-indigo-600 text-white"
                    : "border-indigo-100 bg-white text-indigo-900 hover:scale-105"
                }`}
              >
                {node.label}
              </button>
            </foreignObject>
          );
        })}

        {(() => {
          const seen = new Map<string, number>();
          return outputs.map((output, i) => {
            const pos = getOrbitalPos(output.linkedNodeId, i, outputs.length);
            const count = seen.get(output.id) ?? 0;
            seen.set(output.id, count + 1);
            const key = count === 0 ? output.id : `${output.id}-${count}`;
            return (
              <foreignObject key={key} x={pos.x - 40} y={pos.y - 15} width={80} height={30}>
                <div className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-center text-[10px] font-bold text-amber-700 shadow-sm">
                  {output.label}
                </div>
              </foreignObject>
            );
          });
        })()}
      </svg>

      <div className="pointer-events-none absolute left-0 right-0 top-4 text-center">
        <span className="rounded-full border bg-white/80 px-3 py-1 text-xs text-slate-500 backdrop-blur">
          {selection.start && !selection.end ? "Tap another node to see the path" : "Tap any two nodes to trace connections"}
        </span>
      </div>
    </div>
  );
};

export default OrbitalCycle;
