import { useMemo } from "react";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";

type CircuitNode = { id: string; label: string };

type CycleCircuitProps = {
  cycleNodes: CircuitNode[];
  inputs: CircuitNode[];
  outputs: CircuitNode[];
  onBreakCycle?: (source: string, target: string) => void;
};

const MIN_RADIUS = 160;
const NODE_WIDTH = 112;
const NODE_HEIGHT = 56;
const NODE_HALF_W = NODE_WIDTH / 2;
const NODE_HALF_H = NODE_HEIGHT / 2;
const EDGE_PAD = 6;

const CycleCircuit = ({ cycleNodes, inputs, outputs, onBreakCycle }: CycleCircuitProps) => {
  const radius = useMemo(() => {
    if (cycleNodes.length === 0) return MIN_RADIUS;
    const minCircumference = cycleNodes.length * (NODE_WIDTH + 32);
    return Math.max(MIN_RADIUS, minCircumference / (2 * Math.PI));
  }, [cycleNodes.length]);

  const canvasSize = Math.ceil((radius + NODE_HALF_W + EDGE_PAD + 24) * 2);
  const center = canvasSize / 2;
  const arcInset = (Math.max(NODE_HALF_W, NODE_HALF_H) + EDGE_PAD) / radius;

  const positions = useMemo(
    () =>
      cycleNodes.map((node, index) => {
        const angle = (index / cycleNodes.length) * 2 * Math.PI - Math.PI / 2;
        return {
          ...node,
          x: center + radius * Math.cos(angle),
          y: center + radius * Math.sin(angle),
          angle,
        };
      }),
    [cycleNodes, center, radius],
  );

  return (
    <div className="flex min-w-[600px] items-center gap-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex w-32 flex-col gap-2 text-right">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Triggers</span>
        {inputs.length ? (
          inputs.map((input) => (
            <div
              key={input.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600"
            >
              {input.label} →
            </div>
          ))
        ) : (
          <span className="text-xs italic text-slate-300">None detected</span>
        )}
      </div>

      <div className="relative flex-shrink-0" style={{ width: canvasSize, height: canvasSize }}>
        <svg
          className="block h-full w-full overflow-visible"
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        >
          <defs>
            <marker
              id="cycle-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="2.5"
              markerHeight="2.5"
              markerUnits="strokeWidth"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
            </marker>
          </defs>
          {positions.map((pos, index) => {
            const nextPos = positions[(index + 1) % positions.length];
            const rawStartAngle = pos.angle;
            const rawEndAngle = nextPos.angle;
            const normalizedEndAngle =
              rawEndAngle <= rawStartAngle ? rawEndAngle + Math.PI * 2 : rawEndAngle;
            const startAngle = rawStartAngle + arcInset;
            const endAngle = normalizedEndAngle - arcInset;
            const delta = endAngle - startAngle;
            const midAngle = startAngle + delta / 2;
            const startX = center + Math.cos(startAngle) * radius;
            const startY = center + Math.sin(startAngle) * radius;
            const endX = center + Math.cos(endAngle) * radius;
            const endY = center + Math.sin(endAngle) * radius;
            const midX = center + Math.cos(midAngle) * radius;
            const midY = center + Math.sin(midAngle) * radius;
            return (
              <g key={`${pos.id}-${nextPos.id}`}>
                <motion.path
                  d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  markerEnd="url(#cycle-arrow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
                <foreignObject x={midX - 12} y={midY - 12} width={24} height={24} className="overflow-visible">
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-400 shadow-sm transition-all hover:scale-110 hover:bg-rose-50"
                    title="Identify a break point"
                    onClick={() => onBreakCycle?.(pos.id, nextPos.id)}
                  >
                    <XCircle size={14} />
                  </button>
                </foreignObject>
                <foreignObject
                  x={pos.x - NODE_HALF_W}
                  y={pos.y - NODE_HALF_H}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  className="overflow-visible"
                >
                  <motion.div
                    className="flex h-full w-full items-center justify-center rounded-xl border border-indigo-100 bg-white px-3 py-2 text-center text-[11px] font-semibold text-indigo-900 shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <span className="line-clamp-2 leading-snug">{pos.label}</span>
                  </motion.div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex w-32 flex-col gap-2 text-left">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Impact</span>
        {outputs.length ? (
          outputs.map((output) => (
            <div
              key={output.id}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
            >
              → {output.label}
            </div>
          ))
        ) : (
          <span className="text-xs italic text-slate-300">None detected</span>
        )}
      </div>
    </div>
  );
};

export default CycleCircuit;
