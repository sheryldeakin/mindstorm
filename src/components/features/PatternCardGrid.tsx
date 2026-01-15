import type { HomePatternCard } from "../../types/home";
import MiniTrendSparkLine from "./MiniTrendSparkLine";

interface PatternCardGridProps {
  patterns: HomePatternCard[];
}

const trendCopy: Record<HomePatternCard["trend"], string> = {
  up: "Trending up",
  down: "Trending down",
  steady: "Steady",
};

const confidenceTone: Record<HomePatternCard["confidence"], string> = {
  low: "ms-badge ms-badge-muted",
  medium: "ms-badge ms-badge-neutral",
  high: "ms-badge ms-badge-positive",
};

const PatternCardGrid = ({ patterns }: PatternCardGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {patterns.map((pattern) => (
      <div key={pattern.id} className="ms-card ms-elev-2 ms-card-hover p-5 text-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{pattern.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{pattern.description}</p>
          </div>
          <MiniTrendSparkLine values={pattern.sparkline} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="ms-badge ms-badge-muted rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {trendCopy[pattern.trend]}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${confidenceTone[pattern.confidence]}`}>
            {pattern.confidence} confidence
          </span>
        </div>
      </div>
    ))}
  </div>
);

export default PatternCardGrid;
