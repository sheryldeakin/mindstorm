import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCcw } from "lucide-react";
import clsx from "clsx";

type NestedCycleCardProps = {
  parentCycle: string[];
  subLoops: string[][];
  nodeLabels: Record<string, string>;
  nodeKinds: Record<string, "context" | "symptom" | "impact">;
};

const NestedCycleCard = ({ parentCycle, subLoops, nodeLabels, nodeKinds }: NestedCycleCardProps) => {
  const getNodeIndex = (id: string) => parentCycle.indexOf(id);
  const getNodeKind = (id: string) => nodeKinds[id] ?? "symptom";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [arcWidth, setArcWidth] = useState(1000);
  const topArcHeight = 140;
  const bottomArcHeight = 120;

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setArcWidth(containerRef.current.clientWidth || 1000);
      }
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mb-12 overflow-visible rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-full bg-rose-50 p-2 text-rose-600">
          <RefreshCcw size={18} />
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Complex pattern</h3>
          <p className="text-xs text-slate-500">
            {subLoops.length > 0
              ? `Main cycle with ${subLoops.length} internal shortcuts detected.`
              : "Single continuous cycle."}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        {parentCycle.map((nodeId, index) => {
          const kind = getNodeKind(nodeId);
          return (
            <div key={nodeId} className="flex min-w-0 flex-1 items-center">
              <div
                className={clsx(
                  "relative w-full rounded-xl border bg-white px-4 py-3 text-center text-sm font-medium shadow-sm",
                  kind === "context" && "border-slate-200 text-slate-600",
                  kind === "symptom" && "border-indigo-100 text-indigo-700",
                  kind === "impact" && "border-amber-200 text-amber-700",
                )}
              >
                {nodeLabels[nodeId] || nodeId}
                {index < parentCycle.length - 1 && (
                  <div className="absolute -right-6 top-1/2 h-[2px] w-6 -translate-y-1/2 bg-slate-200" />
                )}
              </div>
              {index < parentCycle.length - 1 && (
                <div className="-ml-1 text-slate-300">
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <svg
        className="pointer-events-none absolute left-0 top-0 -z-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${arcWidth} ${topArcHeight}`}
        preserveAspectRatio="none"
      >
        <path
          d={`M ${arcWidth - 48} 48 C ${arcWidth - 48} -40, 48 -40, 48 48`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <text
          x={arcWidth / 2}
          y={15}
          textAnchor="middle"
          className="fill-slate-400 text-[10px] font-medium uppercase tracking-widest"
        >
          Repeats
        </text>
      </svg>

      {subLoops.map((loop, idx) => {
        const firstNode = loop[0];
        const lastNode = loop[loop.length - 1];
        const startIndex = getNodeIndex(firstNode);
        const endIndex = getNodeIndex(lastNode);
        if (startIndex === -1 || endIndex === -1) return null;
        if (startIndex === endIndex) return null;

        const leftIndex = Math.min(startIndex, endIndex);
        const rightIndex = Math.max(startIndex, endIndex);
        const leftX = ((leftIndex + 0.5) / parentCycle.length) * arcWidth;
        const rightX = ((rightIndex + 0.5) / parentCycle.length) * arcWidth;
        const midX = (leftX + rightX) / 2;
        const stackOffset = Math.max(0, (loop.length - 2) * 12) + idx * 10;
        const arcHeight = bottomArcHeight + stackOffset;
        const arcBottomOffset = -stackOffset;

        return (
          <div
            key={`${loop.join("-")}-${idx}`}
            className="pointer-events-none absolute left-0 w-full"
            style={{ height: arcHeight, bottom: arcBottomOffset }}
          >
            <svg
              className="h-full w-full overflow-visible"
              viewBox={`0 0 ${arcWidth} ${arcHeight}`}
              preserveAspectRatio="none"
            >
              <path
                d={`M ${rightX} 10 Q ${midX} ${arcHeight}, ${leftX} 10`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                markerEnd="url(#arrowhead-rose)"
              />
              <rect
                x={midX - 40}
                y={arcHeight - 28}
                width="80"
                height="20"
                rx="10"
                fill="white"
                stroke="#ffe4e6"
              />
              <text
                x={midX}
                y={arcHeight - 14}
                textAnchor="middle"
                className="fill-rose-600 text-[9px] font-bold uppercase"
              >
                Rapid cycle
              </text>
            </svg>
          </div>
        );
      })}

      <svg width="0" height="0">
        <defs>
          <marker id="arrowhead-rose" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

export default NestedCycleCard;
