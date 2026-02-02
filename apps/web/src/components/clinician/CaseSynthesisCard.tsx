import { Sparkles, AlertCircle, TrendingUp, ShieldAlert, ClipboardCheck } from "lucide-react";
import { Card } from "../ui/Card";
import type { CaseEntry } from "../../types/clinician";

type CoverageMetric = {
  label: string;
  current: number;
  max: number;
};

type CaseSynthesisCardProps = {
  entries: CaseEntry[];
  coverage: CoverageMetric[];
};

export const CaseSynthesisCard = ({ entries, coverage }: CaseSynthesisCardProps) => {
  const highRisk = entries.some((entry) => entry.risk_signal);
  const totalSignals = entries.reduce((acc, entry) => acc + (entry.evidenceUnits?.length || 0), 0);
  const ranked = [...coverage].sort((a, b) => {
    const aScore = a.max ? a.current / a.max : 0;
    const bScore = b.max ? b.current / b.max : 0;
    return bScore - aScore;
  });
  const topCandidate = ranked[0];
  const matchPct = topCandidate?.max
    ? Math.round((topCandidate.current / topCandidate.max) * 100)
    : 0;
  const topLabel = topCandidate?.label || "No candidate yet";
  const alternateCandidates = ranked.slice(1, 3);

  return (
    <Card className="border-slate-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="mt-1 rounded-lg bg-slate-100 p-3 text-slate-700">
          <Sparkles size={20} />
        </div>
        <div className="flex-1 space-y-5">
          <div className="border-l-4 border-indigo-200 pl-4">
            <h3 className="text-base font-semibold text-slate-900">Working Hypothesis</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {entries.length} entries • {totalSignals} extracted signals
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <TrendingUp size={14} className="text-emerald-500" />
                Working Range
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Coverage suggests a current working range rather than a single diagnosis. Highest
                alignment:{" "}
                <span className="font-semibold text-indigo-600">
                  {topLabel} {matchPct ? `(${matchPct}%)` : ""}
                </span>
                .
              </p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Alternate Candidates
                </p>
                {alternateCandidates.length ? (
                  <div className="flex flex-wrap gap-2">
                    {alternateCandidates.map((candidate) => {
                      const pct = candidate.max
                        ? Math.round((candidate.current / candidate.max) * 100)
                        : 0;
                      return (
                        <span
                          key={candidate.label}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                        >
                          {candidate.label} {pct ? `${pct}%` : ""}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">No secondary candidates yet.</p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Evidence Density</span>
                <span className="text-slate-700">{totalSignals}</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <ClipboardCheck size={14} className="text-slate-500" />
                Coverage Snapshot
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Criteria Match</span>
                  <span className="font-semibold">{matchPct ? `${matchPct}%` : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Risk Signal</span>
                  <span className="font-semibold">{highRisk ? "Present" : "None"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ShieldAlert size={14} className="text-rose-500" />
              Safety Read
            </div>
            {highRisk ? (
              <p className="mt-2 text-sm leading-relaxed text-rose-800">
                <strong>Risk cues detected.</strong> Review safety context and ensure follow-up
                planning is documented.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No active risk signals detected in this review period.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
