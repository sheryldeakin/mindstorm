import type { CheckInMetric } from "../../types/checkIn";

/** Patient-Facing: slider controls for check-in metrics. */
interface MetricPickerProps {
  metrics: CheckInMetric[];
  onChange: (id: string, value: number) => void;
}

const MetricPicker = ({ metrics, onChange }: MetricPickerProps) => (
  <div className="space-y-4">
    {metrics.map((metric) => (
      <div key={metric.id} className="ms-glass-surface rounded-2xl border p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>{metric.label}</span>
          <span className="text-brand">{metric.value}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={metric.value}
          onChange={(event) => onChange(metric.id, Number(event.target.value))}
          className="mt-3 w-full accent-brand"
          aria-label={metric.label}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>{metric.lowLabel}</span>
          <span>{metric.highLabel}</span>
        </div>
      </div>
    ))}
  </div>
);

export default MetricPicker;
