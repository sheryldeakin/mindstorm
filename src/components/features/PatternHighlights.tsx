import { patternMetrics } from "../../lib/mockData";
import { Card } from "../ui/Card";

const PatternHighlights = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {patternMetrics.map((metric) => (
      <Card key={metric.id} className="border-brand/15 bg-white p-5 text-slate-900 shadow-sm">
        <p className="text-sm text-brand/60">{metric.label}</p>
        <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
        <p className={`mt-1 text-sm ${metric.status === "up" ? "text-emerald-500" : "text-rose-500"}`}>
          {metric.delta}
        </p>
      </Card>
    ))}
  </div>
);

export default PatternHighlights;
