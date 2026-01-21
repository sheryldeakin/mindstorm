import type { CheckInMetric } from "../../types/checkIn";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import MetricPicker from "./MetricPicker";
import QuickNoteInput from "./QuickNoteInput";

/**
 * Props for DailyCheckInModal (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface DailyCheckInModalProps {
  isOpen: boolean;
  metrics: CheckInMetric[];
  note: string;
  onMetricChange: (id: string, value: number) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const DailyCheckInModal = ({
  isOpen,
  metrics,
  note,
  onMetricChange,
  onNoteChange,
  onClose,
  onSave,
}: DailyCheckInModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Card
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-brand/20 bg-white p-6 text-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-brand/60">Check-in</p>
            <h3 className="mt-2 text-2xl font-semibold">Daily signal snapshot</h3>
            <p className="mt-1 text-sm text-slate-500">
              Quick sliders stabilize trends when journaling is spiky.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-6 space-y-6">
          <MetricPicker metrics={metrics} onChange={onMetricChange} />
          <QuickNoteInput value={note} onChange={onNoteChange} />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save check-in</Button>
        </div>
      </Card>
    </div>
  );
};

export default DailyCheckInModal;
