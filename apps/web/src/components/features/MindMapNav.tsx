import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowLeft, Brain, Briefcase, Heart } from "lucide-react";
import clsx from "clsx";
import MindstormFigureScene from "../avatar/MindstormFigureScene";

type DomainKey = "root" | "context" | "symptom" | "impact";

type DomainItem = {
  id: string;
  label: string;
  subtext?: string;
};

type MindMapNavProps = {
  contextItems: DomainItem[];
  symptomItems: DomainItem[];
  impactItems: DomainItem[];
  onSelectMetric: (domain: Exclude<DomainKey, "root">, item: DomainItem) => void;
  onBack?: () => void;
};

const domains = {
  context: { label: "My Context", icon: Brain, color: "bg-slate-100 text-slate-600" },
  symptom: { label: "My Feelings", icon: Heart, color: "bg-indigo-50 text-indigo-600" },
  impact: { label: "My Life", icon: Briefcase, color: "bg-orange-50 text-orange-600" },
} as const;

const MindMapNav = ({ contextItems, symptomItems, impactItems, onSelectMetric, onBack }: MindMapNavProps) => {
  const [activeDomain, setActiveDomain] = useState<DomainKey>("root");
  const [hovered, setHovered] = useState<string | null>(null);

  const itemsByDomain = useMemo(
    () => ({
      context: contextItems,
      symptom: symptomItems,
      impact: impactItems,
    }),
    [contextItems, impactItems, symptomItems],
  );

  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white/90">
      <LayoutGroup>
        <AnimatePresence>
        {activeDomain !== "root" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setActiveDomain("root")}
            className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Back to center
          </motion.button>
        )}
        </AnimatePresence>

        <AnimatePresence>
          {activeDomain === "root" && onBack && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={onBack}
              className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Zoom out
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div
          layout
          className={clsx(
            "z-20 flex flex-col items-center justify-center",
            activeDomain !== "root" && "absolute right-10 top-10",
          )}
          animate={{
            scale: activeDomain === "root" ? 1.1 : 0.7,
            opacity: activeDomain === "root" ? 1 : 0.85,
          }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
        >
          <div className="pointer-events-none">
            <MindstormFigureScene />
          </div>
          {activeDomain === "root" && (
            <motion.div
              layoutId="character-label"
              className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400"
            >
              You
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
        {activeDomain === "root" ? (
          <motion.div
            key="orbit"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {(Object.keys(domains) as Array<keyof typeof domains>).map((key) => {
              const radius = 180;
              const yOffset = -70;
              const xOffset = -36;
              const positions: Record<keyof typeof domains, { x: number; y: number }> = {
                context: { x: -radius * 1.05 + xOffset, y: -radius * 0.75 + yOffset },
                symptom: { x: xOffset, y: -radius + yOffset },
                impact: { x: radius * 1.05 + xOffset, y: -radius * 0.75 + yOffset },
              };
              const { x, y } = positions[key];
              const config = domains[key];
              const Icon = config.icon;

              return (
                <motion.button
                  key={key}
                  type="button"
                  layoutId={`node-${key}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.08 }}
                  onClick={() => setActiveDomain(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  className={clsx(
                    "pointer-events-auto absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border-4 border-white text-[10px] font-bold uppercase tracking-widest shadow-lg transition-transform",
                    config.color,
                  )}
                >
                  <Icon size={22} />
                  {config.label}
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="absolute inset-x-0 top-1/2 px-10"
          >
            <div className="grid gap-4 md:grid-cols-3">
              {(itemsByDomain[activeDomain] || []).map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => onSelectMetric(activeDomain, item)}
                  className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
                >
                  <div className="text-sm font-semibold text-slate-700">{item.label}</div>
                  {item.subtext && <div className="mt-1 text-xs text-slate-400">{item.subtext}</div>}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
};

export default MindMapNav;
