import type { Insight } from "../../types/journal";
import { Card } from "../ui/Card";

/**
 * Props for InsightCard (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface InsightCardProps {
  insight: Insight;
}

const trendCopy: Record<Insight["trend"], string> = {
  up: "Trending up",
  down: "Trending down",
  steady: "Stable",
};

const InsightCard = ({ insight }: InsightCardProps) => (
  <Card className="p-5 text-slate-900">
    <p className="text-xs uppercase tracking-[0.4em] text-brand/60">{trendCopy[insight.trend]}</p>
    <h3 className="mt-3 text-lg font-semibold text-brand">{insight.title}</h3>
    <p className="mt-2 text-sm text-slate-500">{insight.description}</p>
  </Card>
);

export default InsightCard;
