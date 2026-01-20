import { useEffect, useMemo, useState } from "react";
import DailyCheckInModal from "../components/features/DailyCheckInModal";
import QuickNoteInput from "../components/features/QuickNoteInput";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { CheckInMetric } from "../types/checkIn";
import PageHeader from "../components/layout/PageHeader";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";

const defaultCheckInMetrics: CheckInMetric[] = [
  { id: "energy", label: "Energy", lowLabel: "Drained", highLabel: "Charged", value: 62 },
  { id: "mood", label: "Mood", lowLabel: "Low", highLabel: "Bright", value: 58 },
  { id: "stress", label: "Stress", lowLabel: "Calm", highLabel: "Overloaded", value: 44 },
  { id: "sleep", label: "Sleep quality", lowLabel: "Restless", highLabel: "Rested", value: 51 },
  { id: "connection", label: "Connection", lowLabel: "Isolated", highLabel: "Supported", value: 63 },
  { id: "focus", label: "Focus", lowLabel: "Scattered", highLabel: "Clear", value: 57 },
];

const CheckInPage = () => {
  const { status } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInMetrics, setCheckInMetrics] = useState<CheckInMetric[]>(defaultCheckInMetrics);
  const [checkInNote, setCheckInNote] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const averageSignal = Math.round(
    checkInMetrics.reduce((sum, metric) => sum + metric.value, 0) / checkInMetrics.length,
  );

  const handleMetricChange = (id: string, value: number) => {
    setCheckInMetrics((prev) =>
      prev.map((metric) => (metric.id === id ? { ...metric, value } : metric)),
    );
  };

  useEffect(() => {
    if (status !== "authed") return;
    apiFetch<{ checkIn: { metrics: CheckInMetric[]; note: string } | null }>(
      `/check-ins/${todayISO}`,
    )
      .then(({ checkIn }) => {
        if (!checkIn) return;
        if (Array.isArray(checkIn.metrics) && checkIn.metrics.length) {
          setCheckInMetrics(checkIn.metrics as CheckInMetric[]);
        }
        if (typeof checkIn.note === "string") {
          setCheckInNote(checkIn.note);
        }
      })
      .catch(() => {
        // Silent fail for now; page still usable.
      });
  }, [status, todayISO]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      await apiFetch("/check-ins", {
        method: "POST",
        body: JSON.stringify({
          dateISO: todayISO,
          metrics: checkInMetrics.map(({ id, label, value }) => ({ id, label, value })),
          note: checkInNote,
        }),
      });
      setSavedMessage("Check-in saved.");
      setCheckInOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save check-in.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader
        pageId="check-in"
        actions={<Button onClick={() => setCheckInOpen(true)}>Start check-in</Button>}
      />
      {savedMessage ? (
        <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {savedMessage}
        </Card>
      ) : null}
      {saveError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {saveError}
        </Card>
      ) : null}
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
            <Button variant="secondary" onClick={() => setCheckInOpen(true)} disabled={saving}>
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
        onSave={handleSave}
      />
    </div>
  );
};

export default CheckInPage;
