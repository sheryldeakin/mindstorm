import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { usePatientTranslation } from "../../hooks/usePatientTranslation";
import type { JournalEntry } from "../../types/journal";
import { buildImpactDomainCountsFromEntries } from "../../lib/vizUtils";

type LifeBalanceCompassProps = {
  entries: JournalEntry[];
};

const LifeBalanceCompass = ({ entries }: LifeBalanceCompassProps) => {
  const { getPatientLabel } = usePatientTranslation();
  const data = useMemo(() => {
    const counts = buildImpactDomainCountsFromEntries(entries);
    return counts.map(({ code, value }) => ({
      label: getPatientLabel(code),
      value,
    }));
  }, [entries, getPatientLabel]);

  if (!data.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-700">Life balance compass</h3>
        <p className="mt-2 text-xs text-slate-500">
          Keep journaling to see how your patterns affect your daily life.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-3xl border border-slate-200 bg-white p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Life balance compass</h3>
        <p className="text-xs text-slate-500">Higher rings suggest more strain in that area.</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default LifeBalanceCompass;
