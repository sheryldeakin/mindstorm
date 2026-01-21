import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import type { EvidenceUnit } from "../../types/clinician";
import { Card } from "../ui/Card";

type EvidenceItem = EvidenceUnit & { dateISO: string; confidence?: number | null };

/**
 * Props for EvidenceDrawer (Clinician-Facing).
 * Clinical precision required; displays evidence units and overrides.
 */
type EvidenceDrawerProps = {
  open: boolean;
  title: string;
  evidence: EvidenceItem[];
  overrideStatus?: "MET" | "EXCLUDED" | "UNKNOWN";
  onOverrideChange?: (status: "MET" | "EXCLUDED" | "UNKNOWN" | null) => void;
  rejectedKeys?: Set<string>;
  onToggleReject?: (item: EvidenceItem) => void;
  onFeedback?: (item: EvidenceItem, type: "correct" | "wrong_label" | "wrong_polarity") => void;
  onClose: () => void;
};

const RANGE_OPTIONS = [
  { key: "all", label: "All time" },
  { key: "last_7_days", label: "Last 7 days", days: 7 },
  { key: "last_30_days", label: "Last 30 days", days: 30 },
  { key: "last_90_days", label: "Last 90 days", days: 90 },
  { key: "last_365_days", label: "Last 365 days", days: 365 },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

const buildEvidenceKey = (item: EvidenceItem) => `${item.dateISO}::${item.span}`;

const EvidenceDrawer = ({
  open,
  title,
  evidence,
  overrideStatus,
  onOverrideChange,
  rejectedKeys,
  onToggleReject,
  onFeedback,
  onClose,
}: EvidenceDrawerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [rangeKey, setRangeKey] = useState<RangeKey>("all");

  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setIsVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRangeKey("all");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const sortedEvidence = useMemo(
    () => [...evidence].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    [evidence],
  );
  const latestDateISO = sortedEvidence[sortedEvidence.length - 1]?.dateISO;
  const filteredEvidence = useMemo(() => {
    if (!latestDateISO) return sortedEvidence;
    const range = RANGE_OPTIONS.find((option) => option.key === rangeKey);
    if (!range || !("days" in range)) return sortedEvidence;
    const cutoff = new Date(`${latestDateISO}T00:00:00Z`);
    cutoff.setDate(cutoff.getDate() - (range.days - 1));
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    return sortedEvidence.filter((item) => item.dateISO >= cutoffISO);
  }, [latestDateISO, rangeKey, sortedEvidence]);
  const anxietyEvidence = filteredEvidence.filter((item) => item.label === "SYMPTOM_ANXIETY");
  const firstAnxiety = anxietyEvidence[0];
  const lastAnxiety = anxietyEvidence[anxietyEvidence.length - 1];
  const displayedEvidence = filteredEvidence;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div
        className={clsx(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={clsx(
          "absolute inset-y-0 right-0 w-full max-w-md bg-white p-6 shadow-xl flex flex-col overflow-hidden transition-transform duration-300 ease-out rounded-l-3xl",
          isVisible ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brandLight">Evidence</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {onOverrideChange ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Override</span>
            {(["MET", "EXCLUDED", "UNKNOWN"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onOverrideChange(status === overrideStatus ? null : status)}
                className={
                  status === overrideStatus
                    ? "rounded-full border border-slate-400 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                    : "rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-500 hover:border-slate-400"
                }
              >
                {status}
              </button>
            ))}
            {overrideStatus ? (
              <button
                type="button"
                onClick={() => onOverrideChange(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Revert to auto
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Timeframe</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              {displayedEvidence.length} entries
            </span>
            <select
              value={rangeKey}
              onChange={(event) => setRangeKey(event.target.value as RangeKey)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-2">
          {firstAnxiety && lastAnxiety && firstAnxiety !== lastAnxiety ? (
            <Card className="border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Drift analysis</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="text-xs font-semibold text-slate-500">First:</span> “{firstAnxiety.span}”
                </p>
                <p>
                  <span className="text-xs font-semibold text-slate-500">Latest:</span> “{lastAnxiety.span}”
                </p>
              </div>
            </Card>
          ) : null}
          {displayedEvidence.length ? (
            displayedEvidence.map((item, index) => {
              const isRejected = rejectedKeys?.has(buildEvidenceKey(item)) ?? false;
              const isComputed = item.attributes?.type === "computed";
              return (
                <Card
                  key={`${item.dateISO}-${index}`}
                  className={
                    clsx(
                      "p-4",
                      item.attributes?.polarity === "ABSENT" && "border-rose-200 bg-rose-50",
                      isRejected && "opacity-50 line-through",
                    )
                  }
                >
                  <p className="text-sm text-slate-700">“{item.span}”</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{item.dateISO}</span>
                    <span>{item.attributes?.polarity || "Unknown"}</span>
                    {isComputed ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
                        Timeline Inference
                      </span>
                    ) : null}
                  </div>
                  {item.confidence != null && !isComputed ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Confidence: {(item.confidence * 100).toFixed(0)}%
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {onFeedback ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onFeedback(item, "correct")}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                        >
                          ✅ Correct
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onFeedback(item, "wrong_label");
                            if (onToggleReject && !isRejected) onToggleReject(item);
                          }}
                          className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700"
                        >
                          ❌ Wrong label
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onFeedback(item, "wrong_polarity");
                            if (onToggleReject && !isRejected) onToggleReject(item);
                          }}
                          className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                        >
                          ⚠️ Wrong polarity
                        </button>
                      </>
                    ) : null}
                    {onToggleReject ? (
                      <button
                        type="button"
                        onClick={() => onToggleReject(item)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                      >
                        {isRejected ? "Restore" : "Remove from calc"}
                      </button>
                    ) : null}
                  </div>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No evidence captured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceDrawer;
