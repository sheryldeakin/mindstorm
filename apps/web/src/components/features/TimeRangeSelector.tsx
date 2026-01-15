interface TimeRangeOption {
  id: string;
  label: string;
}

interface TimeRangeSelectorProps {
  options: TimeRangeOption[];
  activeId: string;
  onChange: (value: string) => void;
}

const TimeRangeSelector = ({ options, activeId, onChange }: TimeRangeSelectorProps) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        className={`rounded-full px-4 py-2 text-sm transition ${
          option.id === activeId
            ? "bg-brand text-white shadow-sm"
            : "border border-slate-200 bg-white text-slate-600 hover:border-brand/40"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default TimeRangeSelector;
