type TimeWindowFilterProps = {
  value: number;
  onChange: (days: number) => void;
  onReset?: () => void;
};

const OPTIONS = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "All", value: 0 },
];

const TimeWindowFilter = ({ value, onChange, onReset }: TimeWindowFilterProps) => {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="uppercase tracking-[0.2em] text-slate-400">Window</span>
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={
              option.value === value
                ? "rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                : "rounded-full px-3 py-1 text-[11px] text-slate-500 hover:text-slate-700"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
        >
          Mark reviewed
        </button>
      ) : null}
    </div>
  );
};

export default TimeWindowFilter;
