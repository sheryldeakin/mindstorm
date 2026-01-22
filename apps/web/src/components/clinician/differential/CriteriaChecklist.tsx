import { CheckCircle2, HelpCircle, MinusCircle } from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { CriterionItem, DifferentialDiagnosis } from "./types";
import type { CaseEntry } from "../../../types/clinician";

/**
 * Props for CriteriaChecklist (Clinician-Facing).
 * Clinical precision required; renders criteria coverage states.
 */
type CriteriaChecklistProps = {
  items?: CriterionItem[];
  summary?: DifferentialDiagnosis["criteriaSummary"];
  criteriaSets?: DifferentialDiagnosis["criteriaSets"];
  entries?: CaseEntry[];
};

const CriteriaChecklist = ({ items, summary, criteriaSets, entries = [] }: CriteriaChecklistProps) => {
  const availableSets = useMemo(() => {
    if (!criteriaSets) return [];
    const sets = [
      { key: "current", label: criteriaSets.current.label },
      criteriaSets.diagnostic ? { key: "diagnostic", label: criteriaSets.diagnostic.label } : null,
      { key: "lifetime", label: criteriaSets.lifetime.label },
    ].filter(Boolean) as Array<{ key: "current" | "diagnostic" | "lifetime"; label: string }>;
    return sets;
  }, [criteriaSets]);
  const [activeKey, setActiveKey] = useState<"current" | "diagnostic" | "lifetime">(
    availableSets[0]?.key || "current",
  );

  useEffect(() => {
    if (!availableSets.length) return;
    if (!availableSets.find((item) => item.key === activeKey)) {
      setActiveKey(availableSets[0].key);
    }
  }, [activeKey, availableSets]);

  const activeItems = criteriaSets
    ? (criteriaSets[activeKey]?.items || [])
    : (items || []);
  const activeSummary = criteriaSets
    ? criteriaSets[activeKey]?.summary
    : summary;

  if (!activeSummary) return null;
  const isWeakSignal = (labels?: string[]) => {
    if (!labels?.length) return false;
    const units = entries
      .flatMap((entry) => entry.evidenceUnits || [])
      .filter(
        (unit) => labels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
      );
    if (!units.length) return false;
    return units.every((unit) => unit.attributes?.uncertainty === "HIGH");
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1 text-xs text-slate-500">
        {criteriaSets ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Current window (last 14 days): {criteriaSets.current.summary.current}/{criteriaSets.current.summary.total} criteria — Required:{" "}
                {criteriaSets.current.summary.required}/{criteriaSets.current.summary.total}
              </span>
              {typeof criteriaSets.current.summary.base === "number" ? (
                <span className="text-slate-400">
                  (
                  <span className="text-slate-500">{criteriaSets.current.summary.base}</span>
                  {criteriaSets.current.summary.added ? (
                    <>
                      {" "}
                      <span className="text-emerald-600">+ {criteriaSets.current.summary.added}</span>
                    </>
                  ) : null}
                  {criteriaSets.current.summary.subtracted ? (
                    <>
                      {" "}
                      <span className="text-rose-600">- {criteriaSets.current.summary.subtracted}</span>
                    </>
                  ) : null}
                  {" "}
                  = {criteriaSets.current.summary.current})
                </span>
              ) : null}
            </div>
            {criteriaSets.diagnostic?.summary.window ? (
              <div>
                Diagnostic window (peak): {criteriaSets.diagnostic.summary.window.current}/{criteriaSets.diagnostic.summary.window.total} criteria — Required:{" "}
                {criteriaSets.diagnostic.summary.window.required}/{criteriaSets.diagnostic.summary.window.total}
                {criteriaSets.diagnostic.summary.window.note ? (
                  <span className="text-slate-400"> · {criteriaSets.diagnostic.summary.window.note}</span>
                ) : null}
              </div>
            ) : null}
            <div>
              Lifetime coverage: {criteriaSets.lifetime.summary.current}/{criteriaSets.lifetime.summary.total} criteria — Required:{" "}
              {criteriaSets.lifetime.summary.required}/{criteriaSets.lifetime.summary.total}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {availableSets.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveKey(option.key)}
                  className={
                    option.key === activeKey
                      ? "rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                      : "rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Current window (last 14 days): {activeSummary.current}/{activeSummary.total} criteria — Required: {activeSummary.required}/{activeSummary.total}
              </span>
            </div>
            {activeSummary.window ? (
              <div>
                Diagnostic window (peak): {activeSummary.window.current}/{activeSummary.window.total} criteria — Required:{" "}
                {activeSummary.window.required}/{activeSummary.window.total}
                {activeSummary.window.note ? <span className="text-slate-400"> · {activeSummary.window.note}</span> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
      {activeItems.map((item) => {
        const weakSignal = item.state === "present" && isWeakSignal(item.evidenceLabels);
        return (
        <div
          key={item.id}
          className={clsx(
            "rounded-2xl border p-4",
            item.state === "present" && !weakSignal && "border-emerald-200 bg-emerald-50/40",
            item.state === "present" && weakSignal && "border-amber-200 bg-amber-50/40 border-dashed",
            item.state === "ambiguous" && "border-amber-200 bg-amber-50/40",
            item.state === "absent" && "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex items-start gap-3">
            {item.state === "present" ? (
              <CheckCircle2 className={clsx("mt-0.5 h-5 w-5", weakSignal ? "text-amber-500" : "text-emerald-500")} />
            ) : item.state === "ambiguous" ? (
              <HelpCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            ) : (
              <MinusCircle className="mt-0.5 h-5 w-5 text-slate-400" />
            )}
            <div>
              {weakSignal ? (
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                  Suspected
                </span>
              ) : null}
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
      )})}
    </div>
  );
};

export default CriteriaChecklist;
