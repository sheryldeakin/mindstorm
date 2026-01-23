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

const RADIUS = 100;
const CENTER = 150;

const CycleCircuit = ({ cycleNodes, inputs, outputs, onBreakCycle }: CycleCircuitProps) => {
  const positions = useMemo(
    () =>
      cycleNodes.map((node, index) => {
        const angle = (index / cycleNodes.length) * 2 * Math.PI - Math.PI / 2;
        return {
          ...node,
          x: CENTER + RADIUS * Math.cos(angle),
          y: CENTER + RADIUS * Math.sin(angle),
        };
      }),
    [cycleNodes],
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

      <div className="relative h-[300px] w-[300px] flex-shrink-0">
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {positions.map((pos, index) => {
            const nextPos = positions[(index + 1) % positions.length];
            const midX = (pos.x + nextPos.x) / 2;
            const midY = (pos.y + nextPos.y) / 2;
            return (
              <g key={`${pos.id}-${nextPos.id}`}>
                <motion.path
                  d={`M ${pos.x} ${pos.y} Q ${CENTER} ${CENTER} ${nextPos.x} ${nextPos.y}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
                <foreignObject x={midX - 12} y={midY - 12} width={24} height={24}>
                  <button
                    type="button"
                    className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-400 shadow-sm transition-all hover:scale-110 hover:bg-rose-50"
                    title="Identify a break point"
                    onClick={() => onBreakCycle?.(pos.id, nextPos.id)}
                  >
                    <XCircle size={14} />
                  </button>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {positions.map((pos) => (
          <motion.div
            key={pos.id}
            className="absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-indigo-100 bg-white p-3 text-center text-xs font-semibold text-indigo-900 shadow-md"
            style={{ left: pos.x, top: pos.y }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            {pos.label}
          </motion.div>
        ))}
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
