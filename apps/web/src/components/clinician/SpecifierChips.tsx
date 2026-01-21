import { useMemo } from "react";
import clsx from "clsx";
import type { CaseEntry } from "../../types/clinician";

type SpecifierConfig = {
  id: string;
  label: string;
  evidenceLabels: string[];
};

const SPECIFIERS: SpecifierConfig[] = [
  { id: "anxious", label: "With anxious distress", evidenceLabels: ["SYMPTOM_ANXIETY"] },
  { id: "melancholic", label: "Melancholic features", evidenceLabels: ["SYMPTOM_MOOD", "SYMPTOM_SOMATIC"] },
  { id: "mixed", label: "Mixed features", evidenceLabels: ["SYMPTOM_MANIA"] },
  { id: "psychotic", label: "Psychotic features", evidenceLabels: ["SYMPTOM_PSYCHOSIS"] },
];

type SpecifierRange = {
  specifierId: string;
  label: string;
  evidenceLabels: string[];
  start: string;
  end: string;
  count: number;
};

const GAP_THRESHOLD_DAYS = 28;

const getDaysBetween = (startISO: string, endISO: string) => {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};

const getDensityLabel = (count: number, spanDays: number) => {
  if (spanDays <= 14) return count >= 7 ? "Dense" : count >= 3 ? "Moderate" : "Sparse";
  if (spanDays <= 60) return count >= 12 ? "Dense" : count >= 6 ? "Moderate" : "Sparse";
  return count >= 20 ? "Dense" : count >= 10 ? "Moderate" : "Sparse";
};

const formatSpanLabel = (spanDays: number) => {
  if (spanDays >= 45) return `~${Math.max(1, Math.round(spanDays / 30.4))} months`;
  if (spanDays >= 14) return `~${Math.max(1, Math.round(spanDays / 7))} weeks`;
  return `${spanDays + 1} days`;
};

const buildTimelinePoints = (evidenceDates: string[], startISO: string, endISO: string) => {
  const spanDays = getDaysBetween(startISO, endISO);
  const hits = new Set<number>();
  if (spanDays === 0) return [50];
  evidenceDates.forEach((dateISO) => {
    const offset = getDaysBetween(startISO, dateISO);
    const pct = Math.min(100, Math.max(0, Math.round((offset / (spanDays + 1)) * 100)));
    hits.add(pct);
  });
  return Array.from(hits).sort((a, b) => a - b);
};

const buildRanges = (entries: CaseEntry[], specifier: SpecifierConfig): SpecifierRange[] => {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const ranges: SpecifierRange[] = [];
  let currentRange: { start: string; end: string; count: number } | null = null;

  sorted.forEach((entry, index) => {
    const hasEvidence = (entry.evidenceUnits || []).some(
      (unit) => specifier.evidenceLabels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
    );
    const isLast = index === sorted.length - 1;
    if (!hasEvidence) {
      if (isLast && currentRange) {
        ranges.push({
          specifierId: specifier.id,
          label: specifier.label,
          evidenceLabels: specifier.evidenceLabels,
          start: currentRange.start,
          end: currentRange.end,
          count: currentRange.count,
        });
      }
      return;
    }

    if (!currentRange) {
      currentRange = { start: entry.dateISO, end: entry.dateISO, count: 1 };
      if (isLast) {
        ranges.push({
          specifierId: specifier.id,
          label: specifier.label,
          evidenceLabels: specifier.evidenceLabels,
          start: currentRange.start,
          end: currentRange.end,
          count: currentRange.count,
        });
      }
      return;
    }

    const gapDays = getDaysBetween(currentRange.end, entry.dateISO);
    if (gapDays <= GAP_THRESHOLD_DAYS) {
      currentRange.end = entry.dateISO;
      currentRange.count += 1;
    } else {
      ranges.push({
        specifierId: specifier.id,
        label: specifier.label,
        evidenceLabels: specifier.evidenceLabels,
        start: currentRange.start,
        end: currentRange.end,
        count: currentRange.count,
      });
      currentRange = { start: entry.dateISO, end: entry.dateISO, count: 1 };
    }

    if (isLast && currentRange) {
      ranges.push({
        specifierId: specifier.id,
        label: specifier.label,
        evidenceLabels: specifier.evidenceLabels,
        start: currentRange.start,
        end: currentRange.end,
        count: currentRange.count,
      });
    }
  });

  return ranges;
};

/**
 * Props for SpecifierChips (Clinician-Facing).
 * Clinical precision required; shows DSM specifier patterns.
 */
type SpecifierChipsProps = {
  entries: CaseEntry[];
  onHover?: (labels: string[] | null) => void;
};

const SpecifierChips = ({ entries, onHover }: SpecifierChipsProps) => {
  const sorted = useMemo(() => [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO)), [entries]);
  const latestDate = sorted[sorted.length - 1]?.dateISO;
  const currentWindowStart = useMemo(() => {
    if (!latestDate) return null;
    const date = new Date(`${latestDate}T00:00:00Z`);
    date.setDate(date.getDate() - 13);
    return date.toISOString().slice(0, 10);
  }, [latestDate]);

  const specifierRanges = useMemo(
    () => SPECIFIERS.flatMap((specifier) => buildRanges(sorted, specifier)),
    [sorted],
  );
  const activeRanges = specifierRanges.filter(
    (range) => currentWindowStart && range.end >= currentWindowStart,
  );
  const historicalRanges = specifierRanges.filter(
    (range) => !currentWindowStart || range.end < currentWindowStart,
  );

  const buildEvidenceDates = (range: SpecifierRange) =>
    sorted
      .filter((entry) => entry.dateISO >= range.start && entry.dateISO <= range.end)
      .filter((entry) =>
        (entry.evidenceUnits || []).some(
          (unit) =>
            range.evidenceLabels.includes(unit.label) &&
            unit.attributes?.polarity === "PRESENT",
        ),
      )
      .map((entry) => entry.dateISO);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {activeRanges.length ? (
          activeRanges.map((range, idx) => {
            const spanDays = getDaysBetween(range.start, range.end);
            const density = getDensityLabel(range.count, spanDays);
            const evidenceDates = buildEvidenceDates(range);
            return (
              <div
                key={`${range.specifierId}-${idx}`}
                onMouseEnter={() => onHover?.(range.evidenceLabels)}
                onMouseLeave={() => onHover?.(null)}
                className={clsx(
                  "cursor-pointer rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-700",
                )}
              >
                <div className="font-semibold">Pattern detected: {range.label}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-indigo-600">
                  <span>{range.start} – {range.end} ({formatSpanLabel(spanDays)})</span>
                  <span>Detected in {range.count} entries</span>
                  <span>Density: {density}</span>
                </div>
              <div className="mt-2">
                <div className="relative h-2 w-full rounded-full bg-indigo-100">
                  {buildTimelinePoints(evidenceDates, range.start, range.end).map((point, index) => (
                    <span
                      key={`${range.specifierId}-${index}`}
                      style={{ left: `${point}%` }}
                      className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-sm bg-indigo-500"
                    />
                  ))}
                </div>
              </div>
              </div>
            );
          })
        ) : (
          <span className="text-xs text-slate-400">No active specifier windows detected.</span>
        )}
      </div>
      {historicalRanges.length ? (
        <div className="space-y-2">
          {historicalRanges.map((range, idx) => {
            const spanDays = getDaysBetween(range.start, range.end);
            const density = getDensityLabel(range.count, spanDays);
            const evidenceDates = buildEvidenceDates(range);
            return (
              <div
                key={`${range.specifierId}-${idx}`}
                onMouseEnter={() => onHover?.(range.evidenceLabels)}
                onMouseLeave={() => onHover?.(null)}
                className={clsx(
                  "cursor-pointer rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-600",
                )}
              >
                <div className="font-semibold">{range.label}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span>{range.start} – {range.end} ({formatSpanLabel(spanDays)})</span>
                  <span>Detected in {range.count} entries</span>
                  <span>Density: {density}</span>
                </div>
              <div className="mt-2">
                <div className="relative h-2 w-full rounded-full bg-slate-200">
                  {buildTimelinePoints(evidenceDates, range.start, range.end).map((point, index) => (
                    <span
                      key={`${range.specifierId}-history-${index}`}
                      style={{ left: `${point}%` }}
                      className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-sm bg-slate-500"
                    />
                  ))}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default SpecifierChips;
