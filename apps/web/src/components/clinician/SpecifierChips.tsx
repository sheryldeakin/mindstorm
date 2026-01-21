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
  start: string;
  end: string;
};

const buildRanges = (entries: CaseEntry[], specifier: SpecifierConfig): SpecifierRange[] => {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const ranges: SpecifierRange[] = [];
  let currentStart: string | null = null;

  sorted.forEach((entry, index) => {
    const hasEvidence = (entry.evidenceUnits || []).some(
      (unit) => specifier.evidenceLabels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
    );
    if (hasEvidence && !currentStart) {
      currentStart = entry.dateISO;
    }
    const isLast = index === sorted.length - 1;
    if ((!hasEvidence && currentStart) || (isLast && currentStart)) {
      const end = hasEvidence && isLast ? entry.dateISO : sorted[index - 1]?.dateISO;
      if (end) {
        ranges.push({ specifierId: specifier.id, start: currentStart, end });
      }
      currentStart = null;
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

  const currentSpecifiers = SPECIFIERS.filter((specifier) =>
    sorted.some((entry) => {
      if (!currentWindowStart) return false;
      return (
        entry.dateISO >= currentWindowStart &&
        (entry.evidenceUnits || []).some(
          (unit) => specifier.evidenceLabels.includes(unit.label) && unit.attributes?.polarity === "PRESENT",
        )
      );
    }),
  );

  const historicalRanges = useMemo(
    () =>
      SPECIFIERS.flatMap((specifier) => buildRanges(sorted, specifier)).filter(
        (range) =>
          !currentSpecifiers.some((current) => current.id === range.specifierId && range.end >= (currentWindowStart || "")),
      ),
    [sorted, currentSpecifiers, currentWindowStart],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {currentSpecifiers.length ? (
          currentSpecifiers.map((specifier) => (
            <span
              key={specifier.id}
              onMouseEnter={() => onHover?.(specifier.evidenceLabels)}
              onMouseLeave={() => onHover?.(null)}
              className="cursor-pointer rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              Pattern detected: {specifier.label}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">No active specifiers detected.</span>
        )}
      </div>
      {historicalRanges.length ? (
        <div className="flex flex-wrap gap-2">
          {historicalRanges.map((range, idx) => {
            const spec = SPECIFIERS.find((item) => item.id === range.specifierId);
            if (!spec) return null;
            return (
              <span
                key={`${range.specifierId}-${idx}`}
                onMouseEnter={() => onHover?.(spec.evidenceLabels)}
                onMouseLeave={() => onHover?.(null)}
                className={clsx(
                  "cursor-pointer rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500",
                )}
              >
                {spec.label} ({range.start} - {range.end})
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default SpecifierChips;
