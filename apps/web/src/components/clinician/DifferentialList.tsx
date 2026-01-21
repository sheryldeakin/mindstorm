import clsx from "clsx";

type DifferentialItem = {
  id: string;
  label: string;
  current: number;
  lifetime: number;
  max: number;
  blocked?: boolean;
  blockedReason?: string;
};

/**
 * Props for DifferentialList (Clinician-Facing).
 * Clinical precision required; displays criteria coverage bars.
 */
type DifferentialListProps = {
  items: DifferentialItem[];
};

const DifferentialList = ({ items }: DifferentialListProps) => {
  const sorted = [...items].sort((a, b) => b.current - a.current);

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const currentPct = Math.min(1, item.current / item.max) * 100;
        const lifetimePct = Math.min(1, item.lifetime / item.max) * 100;
        return (
          <div
            key={item.id}
            className={clsx(
              "rounded-2xl border p-4",
              item.blocked ? "border-slate-200 bg-slate-50/80 text-slate-400" : "border-slate-200",
            )}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{item.label}</span>
              <span className="text-xs text-slate-500">
                Coverage: {item.current}/{item.max} current • {item.lifetime}/{item.max} lifetime
              </span>
            </div>
            <div className="relative mt-3 h-3 rounded-full bg-slate-100">
              <div
                className="absolute left-0 top-0 h-3 rounded-full bg-indigo-500"
                style={{ width: `${currentPct}%` }}
              />
              <div
                className="absolute left-0 top-0 h-3 rounded-full border border-indigo-500 bg-transparent"
                style={{ width: `${lifetimePct}%` }}
              />
            </div>
            {item.blocked && item.blockedReason ? (
              <p className="mt-2 text-xs text-amber-700">{item.blockedReason}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default DifferentialList;
