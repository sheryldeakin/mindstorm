import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { JournalEntry } from "../../types/journal";
import { buildStreamData } from "../../lib/vizUtils";
import { usePatientTranslation } from "../../hooks/usePatientTranslation";

type PatternStreamProps = {
  series: ThemeSeries[];
  entries: JournalEntry[];
  onSelectTheme?: (theme: string) => void;
  activeTheme?: string | null;
  rangeKey?: string;
};

const palette = ["#14b8a6", "#6366f1", "#f43f5e", "#f59e0b", "#0ea5e9"];

const formatDateLabel = (dateISO: string) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length || !label) return null;
  const theme = payload[0]?.name ?? "This theme";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
      On {formatDateLabel(label)}, {theme} was prominent.
    </div>
  );
};

const PatternStream = ({
  series,
  entries,
  onSelectTheme,
  activeTheme,
  rangeKey,
}: PatternStreamProps) => {
  const { getPatientLabel } = usePatientTranslation();
  const { data, keys } = useMemo(
    () => buildStreamData(series, entries, getPatientLabel, rangeKey),
    [entries, getPatientLabel, rangeKey, series],
  );

  return (
    <motion.div
      className="rounded-3xl border border-slate-200 bg-white p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Emotional weather</h3>
        <p className="text-xs text-slate-500">
          Layers show which themes rise together over time.
        </p>
      </div>
      <div className="flex h-56 w-full gap-3">
        <div className="w-28 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 text-[10px] text-slate-600">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
            Colors
          </p>
          <div className="mt-2 max-h-[180px] space-y-1 overflow-y-auto pr-1">
            {keys.length ? (
              keys.map((theme, index) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => onSelectTheme?.(theme)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition ${
                    activeTheme === theme ? "bg-white shadow-sm" : "hover:bg-white/70"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: palette[index % palette.length] }}
                  />
                  <span className="truncate capitalize">{theme}</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-400">No themes yet.</p>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              {keys.map((theme, index) => (
                <linearGradient
                  key={`stream-gradient-${theme}`}
                  id={`stream-gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={palette[index % palette.length]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={palette[index % palette.length]} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="dateISO"
              tickFormatter={formatDateLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip content={<CustomTooltip />} />
            {keys.map((theme, index) => (
              <Area
                key={theme}
                dataKey={theme}
                type="basis"
                stackId="1"
                stroke={activeTheme === theme ? "#ffffff" : "none"}
                strokeWidth={activeTheme === theme ? 1.5 : 0}
                fill={`url(#stream-gradient-${index})`}
                fillOpacity={activeTheme && activeTheme !== theme ? 0.2 : 0.6}
                strokeOpacity={activeTheme && activeTheme !== theme ? 0.4 : 1}
                dot={false}
                name={theme}
                cursor={onSelectTheme ? "pointer" : "default"}
                onClick={(event) => {
                  const selected = String(event?.dataKey ?? theme);
                  onSelectTheme?.(selected);
                }}
              />
            ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default PatternStream;
