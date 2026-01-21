import clsx from "clsx";
import type { SpecifierTag } from "./types";

/**
 * Props for Specifiers (Clinician-Facing).
 * Clinical precision required; displays specifier ranges.
 */
type SpecifiersProps = {
  specifiers: SpecifierTag[];
};

const formatSpanLabel = (spanDays?: number) => {
  if (!spanDays && spanDays !== 0) return null;
  if (spanDays >= 45) return `~${Math.max(1, Math.round(spanDays / 30.4))} months`;
  if (spanDays >= 14) return `~${Math.max(1, Math.round(spanDays / 7))} weeks`;
  return `${spanDays + 1} days`;
};

const Specifiers = ({ specifiers }: SpecifiersProps) => {
  if (!specifiers.length) {
    return <p className="text-sm text-slate-500">No specifier patterns observed.</p>;
  }

  return (
    <div className="space-y-2">
      {specifiers.map((specifier) => (
        <div
          key={`${specifier.label}-${specifier.startISO}`}
          className={clsx(
            "rounded-2xl border px-3 py-2 text-xs",
            specifier.active
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-slate-200 text-slate-600",
          )}
        >
          <div className="font-semibold">{specifier.label}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            <span>
              {specifier.startISO} – {specifier.endISO}
              {specifier.spanDays !== undefined ? ` (${formatSpanLabel(specifier.spanDays)})` : ""}
            </span>
            {typeof specifier.evidenceCount === "number" ? (
              <span>Detected in {specifier.evidenceCount} entries</span>
            ) : null}
            {specifier.density ? <span>Density: {specifier.density}</span> : null}
          </div>
          {specifier.timelinePoints?.length ? (
            <div className="mt-2">
              <div className="relative h-2 w-full rounded-full bg-slate-200">
                {specifier.timelinePoints.map((point, index) => (
                  <span
                    key={`${specifier.label}-${specifier.startISO}-${index}`}
                    style={{ left: `${point}%` }}
                    className={clsx(
                      "absolute top-0 h-2 w-2 -translate-x-1/2 rounded-sm",
                      specifier.active ? "bg-indigo-600" : "bg-slate-600",
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default Specifiers;
