import { useMemo } from "react";
import { motion } from "framer-motion";
import type { JournalEntry } from "../../types/journal";

type Bubble = {
  label: string;
  size: number;
  opacity: number;
  toneClass: string;
};

const toneClassMap: Record<string, string> = {
  positive: "bg-teal-100 text-teal-800 border-teal-200",
  negative: "bg-rose-100 text-rose-800 border-rose-200",
  neutral: "bg-indigo-50 text-indigo-700 border-indigo-100",
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const RecentEmotionsPulse = ({ entries }: { entries: JournalEntry[] }) => {
  const bubbles = useMemo<Bubble[]>(() => {
    const map = new Map<string, { count: number; tone: string; intensitySum: number }>();

    entries.forEach((entry) => {
      (entry.emotions || []).forEach((emotion) => {
        const current = map.get(emotion.label) || {
          count: 0,
          tone: emotion.tone,
          intensitySum: 0,
        };
        map.set(emotion.label, {
          count: current.count + 1,
          tone: emotion.tone,
          intensitySum: current.intensitySum + (emotion.intensity || 50),
        });
      });
    });

    return Array.from(map.entries())
      .map(([label, data]) => {
        const averageIntensity = data.count ? data.intensitySum / data.count : 50;
        return {
          label,
          size: clamp(40 + data.count * 10, 44, 84),
          opacity: clamp(0.5 + averageIntensity / 200, 0.55, 1),
          toneClass: toneClassMap[data.tone] || toneClassMap.neutral,
        };
      })
      .sort((a, b) => b.size - a.size)
      .slice(0, 8);
  }, [entries]);

  if (!bubbles.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500">
        No emotions logged yet.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-4">
      {bubbles.map((bubble, index) => (
        <motion.div
          key={bubble.label}
          className={`rounded-full border shadow-sm flex items-center justify-center text-xs font-bold ${bubble.toneClass}`}
          style={{ width: bubble.size, height: bubble.size, opacity: bubble.opacity }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: bubble.opacity }}
          transition={{ type: "spring", stiffness: 120, delay: index * 0.05 }}
          whileHover={{ scale: 1.08, zIndex: 10 }}
        >
          {bubble.label}
        </motion.div>
      ))}
    </div>
  );
};

export default RecentEmotionsPulse;
