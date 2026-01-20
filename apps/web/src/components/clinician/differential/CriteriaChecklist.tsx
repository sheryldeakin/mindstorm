import { CheckCircle2, HelpCircle, MinusCircle } from "lucide-react";
import clsx from "clsx";
import type { CriterionItem } from "./types";

type CriteriaChecklistProps = {
  items: CriterionItem[];
  summary: {
    current: number;
    required: number;
    total: number;
    base?: number;
    added?: number;
    subtracted?: number;
    window?: {
      label: string;
      current: number;
      total: number;
      required: number;
      note?: string;
    };
  };
};

const CriteriaChecklist = ({ items, summary }: CriteriaChecklistProps) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Lifetime coverage: {summary.current}/{summary.total} criteria — Required: {summary.required}/{summary.total}
          </span>
          {typeof summary.base === "number" ? (
            <span className="text-slate-400">
              (
              <span className="text-slate-500">{summary.base}</span>
              {summary.added ? (
                <>
                  {" "}
                  <span className="text-emerald-600">+ {summary.added}</span>
                </>
              ) : null}
              {summary.subtracted ? (
                <>
                  {" "}
                  <span className="text-rose-600">- {summary.subtracted}</span>
                </>
              ) : null}
              {" "}
              = {summary.current})
            </span>
          ) : null}
        </div>
        {summary.window ? (
          <div>
            {summary.window.label}: {summary.window.current}/{summary.window.total} criteria — Required:{" "}
            {summary.window.required}/{summary.window.total}
            {summary.window.note ? <span className="text-slate-400"> · {summary.window.note}</span> : null}
          </div>
        ) : null}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            "rounded-2xl border p-4",
            item.state === "present" && "border-emerald-200 bg-emerald-50/40",
            item.state === "ambiguous" && "border-amber-200 bg-amber-50/40",
            item.state === "absent" && "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex items-start gap-3">
            {item.state === "present" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
            ) : item.state === "ambiguous" ? (
              <HelpCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            ) : (
              <MinusCircle className="mt-0.5 h-5 w-5 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.evidenceNote}</p>
              {item.recency ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Last noted {item.recency}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CriteriaChecklist;
