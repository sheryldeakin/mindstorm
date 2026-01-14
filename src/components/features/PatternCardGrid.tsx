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
  low: "text-amber-600 bg-amber-50 border-amber-200",
  medium: "text-sky-600 bg-sky-50 border-sky-200",
  high: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const PatternCardGrid = ({ patterns }: PatternCardGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {patterns.map((pattern) => (
      <div
        key={pattern.id}
        className="rounded-3xl border border-brand/15 bg-white p-5 text-slate-900 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{pattern.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{pattern.description}</p>
          </div>
          <MiniTrendSparkLine values={pattern.sparkline} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
            {trendCopy[pattern.trend]}
          </span>
          <span className={`rounded-full border px-3 py-1 ${confidenceTone[pattern.confidence]}`}>
            {pattern.confidence} confidence
          </span>
        </div>
      </div>
    ))}
  </div>
);

export default PatternCardGrid;
