import { ArrowRight, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

type StoryNode = { id: string; label: string; type: "context" | "symptom" | "impact" };

type CycleStoryProps = {
  nodes: StoryNode[];
  frequency: number;
};

const CycleStory = ({ nodes, frequency }: CycleStoryProps) => {
  const loopLabel = nodes[0]?.label ?? "Cycle";
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          The "{loopLabel}" loop
        </h3>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-400">
          <RefreshCcw size={12} />
          Repeated {frequency} times
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {nodes.map((node, index) => (
          <div key={`${node.id}-${index}`} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={[
                "w-32 shrink-0 rounded-xl border px-4 py-3 text-center text-sm font-medium",
                node.type === "context" ? "bg-slate-50 border-slate-200 text-slate-600" : "",
                node.type === "symptom" ? "bg-white border-indigo-100 text-indigo-700 shadow-sm" : "",
                node.type === "impact" ? "bg-orange-50 border-orange-100 text-orange-700" : "",
              ].join(" ")}
            >
              {node.label}
            </motion.div>

            {index < nodes.length - 1 ? (
              <ArrowRight className="mx-2 text-slate-300" size={18} />
            ) : (
              <div className="ml-2 flex items-center gap-1 text-xs font-semibold text-rose-500">
                <div className="h-[2px] w-4 bg-rose-200" />
                <span>Feeds back</span>
                <RefreshCcw size={14} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CycleStory;
