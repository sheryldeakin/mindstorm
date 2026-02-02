import { ArrowRight, Quote, Activity, Check, X } from "lucide-react";
import { useState } from "react";
import { Card } from "../ui/Card";
import type { CaseEntry, EvidenceUnit } from "../../types/clinician";

type SignalTranslationFeedProps = {
  entries: CaseEntry[];
  filterUnit?: (unit: EvidenceUnit) => boolean;
  title?: string;
  label?: string;
};

const SignalTranslationFeed = ({
  entries,
  filterUnit,
  title = "Evidence Review Queue",
  label = "pending",
}: SignalTranslationFeedProps) => {
  const [reviewState, setReviewState] = useState<Record<string, "accepted" | "rejected">>({});
  const recentSignals = entries
    .slice()
    .reverse()
    .flatMap((entry) =>
      (entry.evidenceUnits || [])
        .filter((unit) => (filterUnit ? filterUnit(unit) : true))
        .slice(0, 1)
        .map((unit) => ({
          date: entry.dateISO,
          text: unit.span,
          signal: unit.label,
          polarity: unit.attributes?.polarity || "PRESENT",
        })),
    )
    .slice(0, 4);

  if (recentSignals.length === 0) return null;

  return (
    <Card className="overflow-hidden border-slate-200 p-0">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-slate-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">
          {recentSignals.length} {label}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 border-b border-slate-200 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span>Raw Narrative</span>
        <span className="text-center">Map</span>
        <span className="text-right">Structured Signal</span>
      </div>

      <div className="divide-y divide-slate-100">
        {recentSignals.map((item, idx) => {
          const key = `${item.date}-${item.signal}-${idx}`;
          const review = reviewState[key];
          return (
          <div
            key={key}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50/50"
          >
            <div className="relative">
              <Quote size={12} className="absolute -left-2 -top-1 text-slate-300" />
              <p className="line-clamp-2 pl-2 text-xs italic text-slate-600">
                "{item.text}"
              </p>
              <div className="mt-1 text-[10px] text-slate-400">{item.date}</div>
            </div>

            <div className="flex justify-center text-slate-300">
              <ArrowRight size={14} />
            </div>

            <div className="flex items-center justify-end gap-3">
              <div
                className={[
                  "max-w-[140px] truncate rounded-md border px-2 py-1 text-[10px] font-mono font-medium",
                  item.polarity === "PRESENT"
                    ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-slate-100 text-slate-500 line-through",
                  review === "accepted" ? "ring-1 ring-emerald-300" : "",
                  review === "rejected" ? "ring-1 ring-rose-300 opacity-70" : "",
                ].join(" ")}
              >
                {item.signal.replace("SYMPTOM_", "")}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewState((prev) => ({ ...prev, [key]: "rejected" }))}
                  className="rounded p-1 text-slate-300 transition-colors hover:bg-rose-100 hover:text-rose-600"
                  title="Reject Signal (Hallucination/Error)"
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setReviewState((prev) => ({ ...prev, [key]: "accepted" }))}
                  className="rounded p-1 text-slate-300 transition-colors hover:bg-emerald-100 hover:text-emerald-600"
                  title="Confirm Signal"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-2 text-center">
        <p className="text-[10px] text-slate-500">
          Showing 4 most recent extractions from {entries.length} analyzed entries.
        </p>
      </div>
    </Card>
  );
};

export default SignalTranslationFeed;
