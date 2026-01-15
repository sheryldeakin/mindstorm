import type { PatternInfluence } from "../../types/patterns";
import { Card } from "../ui/Card";

interface InfluencesPanelProps {
  influences: PatternInfluence[];
}

const directionCopy: Record<PatternInfluence["direction"], string> = {
  up: "Rises with",
  down: "Eases with",
  steady: "Steady around",
};

const directionTone: Record<PatternInfluence["direction"], string> = {
  up: "text-rose-500",
  down: "text-emerald-500",
  steady: "text-slate-500",
};

const InfluencesPanel = ({ influences }: InfluencesPanelProps) => (
  <Card className="p-6 text-slate-900">
    <h3 className="text-xl font-semibold">What seems connected</h3>
    <p className="mt-1 text-sm text-slate-500">Influences surfaced from tagged context.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {influences.map((influence) => (
        <div key={influence.id} className="ms-glass-surface rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">{influence.label}</p>
            <span className={`text-xs font-semibold ${directionTone[influence.direction]}`}>
              {directionCopy[influence.direction]}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{influence.detail}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Confidence</span>
            <span>{influence.confidence}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-sky-400"
              style={{ width: `${influence.confidence}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default InfluencesPanel;
