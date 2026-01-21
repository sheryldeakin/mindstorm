import clsx from "clsx";
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { DiagnosisCard as DiagnosisCardType } from "./types";

/**
 * Props for DiagnosisCard (Clinician-Facing).
 * Clinical precision required; shows diagnostic candidate details.
 */
type DiagnosisCardProps = {
  data: DiagnosisCardType;
  selected: boolean;
  pinned: boolean;
  onSelect: (key: DiagnosisCardType["key"]) => void;
  onTogglePin?: (key: DiagnosisCardType["key"]) => void;
};

const DiagnosisCard = ({ data, selected, pinned, onSelect, onTogglePin }: DiagnosisCardProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(data.key)}
      aria-pressed={selected}
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/40",
        selected ? "border-brand bg-brand/5" : "border-slate-200 bg-white",
        data.blocked && "border-rose-200",
      )}
    >
      {data.blocked ? (
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(248,113,113,0.15)_0,rgba(248,113,113,0.15)_6px,transparent_6px,transparent_12px)]" />
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{data.abbreviation}</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-800">{data.title}</h4>
          {data.rankingReason ? (
            <p className="mt-1 text-[11px] text-slate-500">{data.rankingReason}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onTogglePin?.(data.key);
            }}
            className={clsx(
              "rounded-full border px-2 py-1 text-[11px] font-semibold",
              pinned ? "border-indigo-400 bg-indigo-100 text-indigo-700" : "border-slate-200 text-slate-500",
            )}
            aria-pressed={pinned}
          >
            {pinned ? "Pinned" : "Pin"}
          </button>
          <span
            className={clsx(
              "rounded-full px-2 py-1 text-xs font-semibold",
              data.likelihood === "High" && "bg-emerald-100 text-emerald-700",
              data.likelihood === "Moderate" && "bg-amber-100 text-amber-700",
              data.likelihood === "Low" && "bg-slate-100 text-slate-500",
            )}
          >
            {data.likelihood}
          </span>
        </div>
      </div>
      {data.shortSummary ? (
        <p className="mt-2 text-xs text-slate-500">{data.shortSummary}</p>
      ) : null}
      {data.criteriaPreview ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Criteria coverage</span>
            <span>
              {data.criteriaPreview.met}/{data.criteriaPreview.total}
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={data.criteriaPreview.met}
            aria-valuemin={0}
            aria-valuemax={data.criteriaPreview.total}
          >
            <div
              className="h-2 rounded-full bg-slate-800 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (data.criteriaPreview.met / data.criteriaPreview.total) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}
      {data.cycleAlignment ? (
        <div className="mt-3 flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            {data.cycleAlignment.state === "met" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : data.cycleAlignment.state === "mismatch" ? (
              <XCircle className="h-4 w-4 text-rose-500" />
            ) : (
              <HelpCircle className="h-4 w-4 text-slate-400" />
            )}
            <span>
              Cycle alignment:{" "}
              {data.cycleAlignment.state === "met"
                ? "Met"
                : data.cycleAlignment.state === "mismatch"
                  ? "Mismatch"
                  : "Unknown"}
            </span>
          </div>
          {data.cycleAlignment.note ? (
            <span className="ml-2 text-[10px] text-slate-400">{data.cycleAlignment.note}</span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          Status: {data.status}
          {data.trend ? (
            <span className="ml-2 text-[11px] text-slate-500">
              {data.trend === "up" ? "↑" : data.trend === "down" ? "↓" : "→"}
            </span>
          ) : null}
        </span>
        {data.criteriaPreview ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {data.criteriaPreview.met}/{data.criteriaPreview.total} signals
          </span>
        ) : null}
      </div>
      {data.blocked ? (
        <div className="mt-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
          Rule-Out Active{data.blockedReason ? ` · ${data.blockedReason}` : ""}
        </div>
      ) : null}
    </button>
  );
};

export default DiagnosisCard;
