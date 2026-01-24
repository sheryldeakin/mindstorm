import type { PatternMetric } from "../../types/journal";
import { Card } from "../ui/Card";

/** Patient-Facing: surfaces high-level pattern metrics in a non-clinical summary. */
interface PatternHighlightsProps {
  metrics: PatternMetric[];
}

const PatternHighlights = ({ metrics }: PatternHighlightsProps) => (
  <div className="grid gap-4 md:grid-cols-3">
    {metrics.map((metric) => (
      <Card key={metric.id} className="p-5 text-slate-900">
        <p className="small-label text-slate-400">{metric.label}</p>
        <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
        <p className={`mt-1 text-sm ${metric.status === "up" ? "text-emerald-500" : "text-rose-500"}`}>
          {metric.delta}
        </p>
      </Card>
    ))}
  </div>
);

export default PatternHighlights;
