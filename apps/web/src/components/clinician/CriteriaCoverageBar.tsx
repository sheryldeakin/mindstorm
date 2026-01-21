import clsx from "clsx";

/**
 * Props for CriteriaCoverageBar (Clinician-Facing).
 * Clinical precision required; renders criteria coverage with thresholds.
 */
type CriteriaCoverageBarProps = {
  label: string;
  current: number;
  lifetime: number;
  max: number;
  threshold?: number;
};

const CriteriaCoverageBar = ({ label, current, lifetime, max, threshold }: CriteriaCoverageBarProps) => {
  const currentPct = Math.min(1, current / max) * 100;
  const lifetimePct = Math.min(1, lifetime / max) * 100;
  const meetsLifetime = threshold ? lifetime >= threshold : lifetime > current;
  const isRemission = threshold ? meetsLifetime && current < threshold : current < lifetime;

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">
          {current}/{max} current • {lifetime}/{max} lifetime
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-slate-100">
        <div
          className="absolute left-0 top-0 h-3 rounded-full bg-indigo-500"
          style={{ width: `${currentPct}%` }}
        />
        <div
          className={clsx("absolute left-0 top-0 h-3 rounded-full border border-indigo-500", {
            "bg-indigo-200/30": isRemission,
            "bg-transparent": !isRemission,
          })}
          style={{ width: `${lifetimePct}%` }}
        />
      </div>
      {isRemission ? <p className="text-xs text-emerald-600">Coverage drop: possible remission</p> : null}
    </div>
  );
};

export default CriteriaCoverageBar;
