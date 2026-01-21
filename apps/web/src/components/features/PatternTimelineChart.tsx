import type { PatternSpanLink, PatternTimelinePoint } from "../../types/patterns";
import { Card } from "../ui/Card";

/**
 * Props for PatternTimelineChart (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface PatternTimelineChartProps {
  scaleLabel: string;
  points: PatternTimelinePoint[];
  spanLinks: PatternSpanLink[];
}

const PatternTimelineChart = ({ scaleLabel, points, spanLinks }: PatternTimelineChartProps) => {
  const maxIntensity = Math.max(...points.map((point) => point.intensity), 1);

  return (
    <Card className="p-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Timeline + intensity</h3>
          <p className="mt-1 text-sm text-slate-500">{scaleLabel}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Relative intensity</p>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="ms-glass-surface rounded-2xl border p-4">
          <div className="flex items-end gap-2">
            {points.map((point) => {
              const height = Math.max(8, Math.round((point.intensity / maxIntensity) * 100));
              return (
                <div key={point.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="relative h-28 w-full overflow-hidden rounded-full">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-brand to-sky-400"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{point.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Pattern-to-span links</p>
          <div className="mt-3 space-y-3">
            {spanLinks.map((link) => (
              <div key={link.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{link.label}</p>
                <p className="mt-1 text-xs text-slate-500">{link.dateRange}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PatternTimelineChart;
