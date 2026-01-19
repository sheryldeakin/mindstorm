import clsx from "clsx";
import type { DiagnosisCard as DiagnosisCardType } from "./types";

type DiagnosisCardProps = {
  data: DiagnosisCardType;
  selected: boolean;
  onSelect: (key: DiagnosisCardType["key"]) => void;
};

const DiagnosisCard = ({ data, selected, onSelect }: DiagnosisCardProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(data.key)}
      aria-pressed={selected}
      className={clsx(
        "w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/40",
        selected ? "border-brand bg-brand/5" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{data.abbreviation}</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-800">{data.title}</h4>
        </div>
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
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>Status: {data.status}</span>
        {data.criteriaPreview ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {data.criteriaPreview.met}/{data.criteriaPreview.total} signals
          </span>
        ) : null}
      </div>
    </button>
  );
};

export default DiagnosisCard;
