import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Briefcase, Heart } from "lucide-react";
import clsx from "clsx";
import MindstormFigureScene from "../avatar/MindstormFigureScene";

type DomainKey = "root" | "context" | "symptom" | "impact";

type DomainItem = {
  id: string;
  label: string;
  subtext?: string;
};

type MindMapNavLabProps = {
  contextItems: DomainItem[];
  symptomItems: DomainItem[];
  impactItems: DomainItem[];
  onSelectMetric: (domain: Exclude<DomainKey, "root">, item: DomainItem) => void;
};

const domains = {
  context: { label: "My Context", icon: Brain, color: "text-slate-600" },
  symptom: { label: "My Feelings", icon: Heart, color: "text-indigo-600" },
  impact: { label: "My Life", icon: Briefcase, color: "text-orange-600" },
} as const;

const MindMapNavLab = ({ contextItems, symptomItems, impactItems, onSelectMetric }: MindMapNavLabProps) => {
  const [activeDomain, setActiveDomain] = useState<DomainKey>("root");
  const [hovered, setHovered] = useState<DomainKey | null>(null);
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

  const positions = useMemo(() => {
    const radius = 180;
    const yOffset = -70;
    const xOffset = -36;
    return {
      context: { x: -radius * 1.05 + xOffset, y: -radius * 0.75 + yOffset },
      symptom: { x: xOffset, y: -radius + yOffset },
      impact: { x: radius * 1.05 + xOffset, y: -radius * 0.75 + yOffset },
    } as const;
  }, []);

  const floatDurations = useMemo(
    () => ({
      context: 4.4,
      symptom: 4.9,
      impact: 5.2,
    }),
    [],
  );

  useEffect(() => {
    return () => {
      if (waveTimeoutRef.current) window.clearTimeout(waveTimeoutRef.current);
      if (transitionTimeoutRef.current) window.clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative flex h-[560px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white/90">
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
          <MindstormFigureScene
            attentionToken={attentionToken}
            attentionYaw={attentionYaw}
            wave={wave}
            activeDomain={activeDomain}
            lookStrengthIdle={hovered ? 0.45 : 0}
          />
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
            <svg className="absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id="node-tether-lab" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(148, 163, 184, 0)" />
                  <stop offset="60%" stopColor="rgba(148, 163, 184, 0.25)" />
                  <stop offset="100%" stopColor="rgba(148, 163, 184, 0.55)" />
                </linearGradient>
              </defs>
              {(Object.keys(domains) as Array<keyof typeof domains>).map((key) => {
                const { x, y } = positions[key];
                return (
                  <line
                    key={key}
                    x1="50%"
                    y1="52%"
                    x2={`calc(50% + ${x}px)`}
                    y2={`calc(50% + ${y}px)`}
                    stroke="url(#node-tether-lab)"
                    strokeWidth="1.2"
                    strokeDasharray="6 8"
                  />
                );
              })}
            </svg>

            {(Object.keys(domains) as Array<keyof typeof domains>).map((key) => {
              const { x, y } = positions[key];
              const config = domains[key];
              const Icon = config.icon;
              const textColor = config.color;
              const bob = hovered === key ? 6 : 4;

              return (
                <motion.button
                  key={key}
                  type="button"
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y: [y - bob, y + bob, y - bob] }}
                  exit={{ opacity: 0, scale: 0 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 1.02 }}
                  onHoverStart={() => setHovered(key)}
                  onHoverEnd={() => setHovered(null)}
                  transition={{
                    y: { duration: floatDurations[key], repeat: Infinity, ease: "easeInOut" },
                    type: "spring",
                    stiffness: 140,
                    damping: 16,
                  }}
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
                    "pointer-events-auto absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border border-white/70 bg-white/40 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-lg backdrop-blur-xl transition-transform",
                    "before:absolute before:inset-1 before:rounded-full before:border before:border-white/40 before:content-['']",
                    textColor,
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
    </div>
  );
};

export default MindMapNavLab;
