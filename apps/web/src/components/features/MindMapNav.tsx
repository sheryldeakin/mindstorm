import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Brain, Briefcase, Heart } from "lucide-react";
import clsx from "clsx";
import MindstormFigureScene from "../avatar/MindstormFigureScene";
import * as THREE from "three";

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
  const [attentionToken, setAttentionToken] = useState(0);
  const [attentionYaw, setAttentionYaw] = useState(0);
  const [wave, setWave] = useState(false);
  const waveTimeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  const itemsByDomain = useMemo(
    () => ({
      context: contextItems,
      symptom: symptomItems,
      impact: impactItems,
    }),
    [contextItems, impactItems, symptomItems],
  );

  useEffect(() => {
    return () => {
      if (waveTimeoutRef.current) window.clearTimeout(waveTimeoutRef.current);
      if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white/90">
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

        <motion.div
          className={clsx(
            "z-20 flex flex-col items-center justify-center",
            activeDomain !== "root" && "absolute right-10 -top-8",
          )}
          animate={{
            scale: activeDomain === "root" ? 1.1 : 0.7,
            opacity: activeDomain === "root" ? 1 : 0.85,
          }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
        >
          <div className="pointer-events-none">
            <MindstormFigureScene attentionToken={attentionToken} attentionYaw={attentionYaw} wave={wave} />
          </div>
          {activeDomain === "root" && (
            <div className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">You</div>
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
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.08, y: y - 6 }}
                  whileTap={{ scale: 1.02 }}
                  onHoverStart={() => setHovered(key)}
                  onHoverEnd={() => setHovered(null)}
                  {...(hovered === key
                    ? {
                        animate: { opacity: 1, scale: 1, x, y: y - 6 },
                        transition: { duration: 1.6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
                      }
                    : {})}
                  transition={{ type: "spring", stiffness: 140, damping: 16 }}
                  onClick={() => {
                    setAttentionToken((prev) => prev + 1);
                    setAttentionYaw(x >= 0 ? 0.45 : -0.45);
                    setWave(true);
                    if (waveTimeoutRef.current) window.clearTimeout(waveTimeoutRef.current);
                    waveTimeoutRef.current = window.setTimeout(() => setWave(false), 180);
                    if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
                    transitionTimeoutRef.current = window.setTimeout(() => setActiveDomain(key), 520);
                  }}
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
              {(() => {
                const seen = new Map<string, number>();
                return (itemsByDomain[activeDomain] || []).map((item) => {
                  const count = seen.get(item.id) ?? 0;
                  seen.set(item.id, count + 1);
                  const key = count === 0 ? item.id : `${item.id}-${count}`;
                  return (
                    <motion.button
                      key={key}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  onClick={() => onSelectMetric(activeDomain, item)}
                  className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
                >
                  <div className="text-sm font-semibold text-slate-700">{item.label}</div>
                  {item.subtext && <div className="mt-1 text-xs text-slate-400">{item.subtext}</div>}
                    </motion.button>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
};

export default MindMapNav;
