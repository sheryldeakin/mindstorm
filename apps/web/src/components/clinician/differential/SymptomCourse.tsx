import clsx from "clsx";
import type { SymptomCourseRow } from "./types";

/**
 * Props for SymptomCourse (Clinician-Facing).
 * Clinical precision required; visualizes symptom severity over time.
 */
type SymptomCourseProps = {
  rows: SymptomCourseRow[];
};

const levelClass = {
  none: "bg-slate-100",
  mild: "bg-amber-200",
  moderate: "bg-orange-400",
  high: "bg-rose-500",
};

const SymptomCourse = ({ rows }: SymptomCourseProps) => {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{row.label}</span>
            <span>{row.buckets[0]?.weekStartISO} → {row.buckets[row.buckets.length - 1]?.weekStartISO}</span>
          </div>
          <div className="flex gap-1">
            {row.buckets.map((bucket) => (
              <span
                key={`${row.label}-${bucket.weekStartISO}`}
                className={clsx("h-3 w-6 rounded-sm", levelClass[bucket.level])}
                title={`${bucket.weekStartISO}: ${bucket.level}`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-slate-100" /> None</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-amber-200" /> Mild</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-orange-400" /> Moderate</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-rose-500" /> High</span>
      </div>
    </div>
  );
};

export default SymptomCourse;
