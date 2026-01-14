import { Card } from "../ui/Card";

interface PatternDetailHeaderProps {
  title: string;
  summary: string;
  phrases: string[];
  paraphrase: string;
  rangeLabel: string;
  intensityLabel: string;
}

const PatternDetailHeader = ({
  title,
  summary,
  phrases,
  paraphrase,
  rangeLabel,
  intensityLabel,
}: PatternDetailHeaderProps) => (
  <Card className="border-brand/15 bg-white p-6 text-slate-900">
    <p className="text-xs uppercase tracking-[0.4em] text-brand/60">Pattern deep dive</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{summary}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
          {rangeLabel}
        </span>
        <span className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-brand">
          {intensityLabel}
        </span>
      </div>
    </div>
    <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <p className="text-sm font-semibold text-slate-700">What this looks like for you</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {phrases.map((phrase) => (
            <span key={phrase} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {phrase}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Paraphrase</p>
        <p className="mt-2 text-sm text-slate-600">{paraphrase}</p>
      </div>
    </div>
  </Card>
);

export default PatternDetailHeader;
