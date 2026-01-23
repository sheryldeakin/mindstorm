import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { usePatientTranslation } from "../../hooks/usePatientTranslation";
import type { ConnectionEdge, ConnectionNode } from "../../lib/vizUtils";
import { buildImpactFlowPaths, isRestrictedLabel } from "../../lib/vizUtils";

type ImpactFlowProps = {
  nodes: ConnectionNode[];
  edges: ConnectionEdge[];
};

type FlowPath = {
  id: string;
  d: string;
  weight: number;
};

const columnTitles: Record<ConnectionNode["type"], string> = {
  context: "Influences",
  symptom: "Experience",
  impact: "Life areas",
};

const ImpactFlow = ({ nodes, edges }: ImpactFlowProps) => {
  const { getPatientLabel } = usePatientTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<FlowPath[]>([]);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => buildImpactFlowPaths(nodes, edges, 5),
    [nodes, edges],
  );

  const columns = useMemo(() => {
    const grouped: Record<ConnectionNode["type"], ConnectionNode[]> = {
      context: [],
      symptom: [],
      impact: [],
    };
    flowNodes.forEach((node) => {
      if (isRestrictedLabel(node.label) || isRestrictedLabel(node.id)) return;
      grouped[node.type].push(node);
    });
    return grouped;
  }, [flowNodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const drawPaths = () => {
      const containerRect = container.getBoundingClientRect();
      const nextPaths: FlowPath[] = [];

      flowEdges.forEach((edge) => {
        const fromEl = nodeRefs.current[edge.from];
        const toEl = nodeRefs.current[edge.to];
        if (!fromEl || !toEl) return;
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const startX = fromRect.right - containerRect.left;
        const startY = fromRect.top + fromRect.height / 2 - containerRect.top;
        const endX = toRect.left - containerRect.left;
        const endY = toRect.top + toRect.height / 2 - containerRect.top;
        const gap = endX - startX;
        const cp1X = startX + gap * 0.4;
        const cp2X = endX - gap * 0.4;
        const d = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;
        nextPaths.push({ id: `${edge.from}-${edge.to}`, d, weight: edge.weight });
      });
      setPaths(nextPaths);
    };

    drawPaths();
    const observer = new ResizeObserver(drawPaths);
    observer.observe(container);
    window.addEventListener("resize", drawPaths);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", drawPaths);
    };
  }, [flowEdges]);

  if (!flowNodes.length || !flowEdges.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-700">Impact flow</h3>
        <p className="mt-2 text-xs text-slate-500">
          Add more reflections to see how influences shape experiences and life areas.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={Math.max(1.5, Math.min(4, path.weight))}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
        ))}
      </svg>

      <div className="relative z-10 grid gap-8 md:grid-cols-3">
        {(["context", "symptom", "impact"] as const).map((columnKey) => (
          <div key={columnKey} className="flex flex-col gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {columnTitles[columnKey]}
            </span>
            <div className="flex flex-col gap-3">
              {columns[columnKey].map((node) => (
                <div
                  key={node.id}
                  ref={(el) => {
                    nodeRefs.current[node.id] = el;
                  }}
                  className={clsx(
                    "rounded-2xl border px-3 py-2 text-center text-xs font-semibold shadow-sm",
                    columnKey === "context" && "border-slate-200 bg-slate-50 text-slate-600",
                    columnKey === "symptom" && "border-indigo-100 bg-white text-indigo-700",
                    columnKey === "impact" && "border-amber-200 bg-amber-50/70 text-amber-800",
                  )}
                >
                  {getPatientLabel(node.label)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImpactFlow;
