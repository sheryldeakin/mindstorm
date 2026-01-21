import Sparkline from "../charts/Sparkline";
import { Card } from "../ui/Card";

/** Patient-Facing: summarizes a pattern with trend and confidence cues. */
export type PatternCardProps = {
  title: string;
  description: string;
  trend: "up" | "down" | "steady";
  confidence: "high" | "medium" | "low";
  series?: number[];
  tags?: string[];
};

const trendGlyph: Record<PatternCardProps["trend"], string> = {
  up: "↑",
  down: "↓",
  steady: "→",
};

const trendLabel: Record<PatternCardProps["trend"], string> = {
  up: "Trending up",
  down: "Trending down",
  steady: "Steady",
};

const confidenceLabel: Record<PatternCardProps["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const confidenceTone: Record<PatternCardProps["confidence"], string> = {
  high: "ms-badge ms-badge-positive",
  medium: "ms-badge ms-badge-neutral",
  low: "ms-badge ms-badge-muted",
};

const SignalMeter = ({ level }: { level: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: 5 }).map((_, index) => (
      <span
        key={index}
        className="h-2 w-2 rounded-full bg-slate-300"
        style={{ opacity: index < level ? 0.75 : 0.2 }}
      />
    ))}
  </div>
);

const PatternCard = ({ title, description, trend, confidence, series, tags = [] }: PatternCardProps) => {
  const meterLevel = Math.max(
    2,
    Math.min(5, (trend === "up" ? 4 : trend === "down" ? 2 : 3) + (confidence === "high" ? 1 : 0)),
  );
  const visibleTags = tags.slice(0, 2);

  return (
    <Card className="relative overflow-hidden rounded-2xl p-6 text-slate-900">
      <div className="ms-card-overlay" />
      <div className="absolute right-4 top-4 h-6 w-10 rounded-full bg-white/50" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="ms-glass-pill inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-600">
          <span aria-hidden>{trendGlyph[trend]}</span>
          <span className="sr-only">{trendLabel[trend]}</span>
        </span>
      </div>
      <p className="relative z-10 mt-2 line-clamp-2 text-sm text-slate-500">{description}</p>
      <div className="relative z-10 mt-4 border-t border-white/30 pt-3">
        {series && series.length >= 2 ? (
          <Sparkline data={series} variant={trend} width={220} height={56} />
        ) : (
          <SignalMeter level={meterLevel} />
        )}
      </div>
      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600">
        <span className="ms-glass-pill rounded-full px-2.5 py-1">{trendLabel[trend]}</span>
        <span className={`rounded-full px-2.5 py-1 ${confidenceTone[confidence]}`}>{confidenceLabel[confidence]}</span>
        {visibleTags.map((tag) => (
          <span key={tag} className="ms-glass-pill rounded-full px-2.5 py-1 text-slate-500">
            {tag}
          </span>
        ))}
      </div>
    </Card>
  );
};

export default PatternCard;
