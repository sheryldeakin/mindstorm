import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Brain, Briefcase, Heart } from "lucide-react";
import clsx from "clsx";

export type DomainKey = "root" | "context" | "symptom" | "impact";

type DomainItem = {
  id: string;
  label: string;
  subtext?: string;
};

type MindMapOverlayLabProps = {
  activeDomain: DomainKey;
  onSelectDomain: (domain: DomainKey) => void;
  contextItems: DomainItem[];
  symptomItems: DomainItem[];
  impactItems: DomainItem[];
  onSelectMetric: (domain: Exclude<DomainKey, "root">, item: DomainItem) => void;
  onHoverDomain?: (domain: DomainKey | null) => void;
};

const domains = {
  context: { label: "My Context", icon: Brain, color: "text-slate-600", bg: "bg-slate-100/50" },
  symptom: { label: "My Feelings", icon: Heart, color: "text-indigo-600", bg: "bg-indigo-50/50" },
  impact: { label: "My Life", icon: Briefcase, color: "text-orange-600", bg: "bg-orange-50/50" },
} as const;

const getDomainItems = (
  activeDomain: DomainKey,
  contextItems: DomainItem[],
  symptomItems: DomainItem[],
  impactItems: DomainItem[],
) => {
  if (activeDomain === "context") return contextItems;
  if (activeDomain === "symptom") return symptomItems;
  if (activeDomain === "impact") return impactItems;
  return [];
};

const MindMapOverlayLab = ({
  activeDomain,
  onSelectDomain,
  contextItems,
  symptomItems,
  impactItems,
  onSelectMetric,
  onHoverDomain,
}: MindMapOverlayLabProps) => {
  const items = getDomainItems(activeDomain, contextItems, symptomItems, impactItems);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6">
      <div className="flex justify-start">
        <AnimatePresence>
          {activeDomain !== "root" && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => onSelectDomain("root")}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-md transition-colors hover:bg-white/50"
            >
              <ArrowLeft size={16} />
              Back to center
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <AnimatePresence>
          {activeDomain === "root" && (
            <div className="relative h-full w-full max-w-md max-h-md">
              {(Object.keys(domains) as Array<keyof typeof domains>).map((key, index) => {
                const config = domains[key];
                const Icon = config.icon;
                const radius = 190;
                const positions: Record<keyof typeof domains, { x: number; y: number }> = {
                  context: { x: -radius * 0.7, y: -radius * 0.9 - 40 },
                  symptom: { x: 0, y: -radius * 1.05 - 40 },
                  impact: { x: radius * 0.7, y: -radius * 0.9 - 40 },
                };
                const { x, y } = positions[key];

                return (
                  <motion.button
                    key={key}
                    onClick={() => onSelectDomain(key)}
                    initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      x,
                      y: [y - 4, y + 4, y - 4],
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => onHoverDomain?.(key)}
                  onHoverEnd={() => onHoverDomain?.(null)}
                  transition={{
                      y: { duration: 3 + index, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                      default: { type: "spring", stiffness: 100, damping: 20 },
                    }}
                  className={clsx(
                    "pointer-events-auto absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border border-white/40 backdrop-blur-xl shadow-lg",
                    config.bg,
                    config.color,
                  )}
                  >
                    <Icon size={24} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{config.label}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center pb-8">
        <AnimatePresence>
          {activeDomain !== "root" && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-white/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl"
            >
              <h3 className="mb-3 text-lg font-semibold text-slate-800">
                {domains[activeDomain as keyof typeof domains]?.label} Insights
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {items.length ? (
                  (() => {
                    const seen = new Map<string, number>();
                    return items.map((item) => {
                      const count = seen.get(item.id) ?? 0;
                      seen.set(item.id, count + 1);
                      const key = count === 0 ? item.id : `${item.id}-${count}`;
                      return (
                        <button
                          key={key}
                      type="button"
                      onClick={() => onSelectMetric(activeDomain as Exclude<DomainKey, "root">, item)}
                      className="rounded-2xl border border-white/60 bg-white/70 p-4 text-left text-sm text-slate-700 shadow-sm transition hover:shadow-md"
                    >
                      <div className="font-semibold">{item.label}</div>
                      {item.subtext && <div className="mt-1 text-xs text-slate-500">{item.subtext}</div>}
                        </button>
                      );
                    });
                  })()
                ) : (
                  <div className="text-sm text-slate-500">No insights yet.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MindMapOverlayLab;
