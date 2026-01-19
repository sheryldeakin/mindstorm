import { useState } from "react";
import DailyCheckInModal from "../components/features/DailyCheckInModal";
import QuickNoteInput from "../components/features/QuickNoteInput";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { CheckInMetric } from "../types/checkIn";
import PageHeader from "../components/layout/PageHeader";

const defaultCheckInMetrics: CheckInMetric[] = [
  { id: "energy", label: "Energy", lowLabel: "Drained", highLabel: "Charged", value: 62 },
  { id: "mood", label: "Mood", lowLabel: "Low", highLabel: "Bright", value: 58 },
  { id: "stress", label: "Stress", lowLabel: "Calm", highLabel: "Overloaded", value: 44 },
  { id: "sleep", label: "Sleep quality", lowLabel: "Restless", highLabel: "Rested", value: 51 },
  { id: "connection", label: "Connection", lowLabel: "Isolated", highLabel: "Supported", value: 63 },
  { id: "focus", label: "Focus", lowLabel: "Scattered", highLabel: "Clear", value: 57 },
];

const CheckInPage = () => {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInMetrics, setCheckInMetrics] = useState<CheckInMetric[]>(defaultCheckInMetrics);
  const [checkInNote, setCheckInNote] = useState("");

  const averageSignal = Math.round(
    checkInMetrics.reduce((sum, metric) => sum + metric.value, 0) / checkInMetrics.length,
  );

  const handleMetricChange = (id: string, value: number) => {
    setCheckInMetrics((prev) =>
      prev.map((metric) => (metric.id === id ? { ...metric, value } : metric)),
    );
  };

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader
        pageId="check-in"
        actions={<Button onClick={() => setCheckInOpen(true)}>Start check-in</Button>}
      />
      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6">
          <h3 className="text-xl font-semibold">Today's signals</h3>
          <p className="mt-1 text-sm text-slate-500">Energy, mood, stress, sleep, connection, focus.</p>
          <div className="mt-6 space-y-4">
            {checkInMetrics.map((metric) => (
              <div key={metric.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{metric.label}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-28 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-sky-400"
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-slate-500">{metric.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="ms-glass-surface mt-6 rounded-2xl border p-4 text-sm text-slate-600">
            Average signal today: <span className="font-semibold text-slate-800">{averageSignal}</span>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-slate-500">Add a quick note to capture context your future self might want.</p>
          <div className="mt-6">
            <QuickNoteInput value={checkInNote} onChange={setCheckInNote} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setCheckInOpen(true)}>
              Edit in modal
            </Button>
          </div>
        </Card>
      </section>
      <DailyCheckInModal
        isOpen={checkInOpen}
        metrics={checkInMetrics}
        note={checkInNote}
        onMetricChange={handleMetricChange}
        onNoteChange={setCheckInNote}
        onClose={() => setCheckInOpen(false)}
        onSave={() => setCheckInOpen(false)}
      />
    </div>
  );
};

export default CheckInPage;
