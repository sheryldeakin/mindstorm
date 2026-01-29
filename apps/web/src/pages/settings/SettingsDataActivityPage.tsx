import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiFetch } from "../../lib/apiClient";
import PageHeader from "../../components/layout/PageHeader";

type ActivityItem = {
  id: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const SettingsDataActivityPage = () => {
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const openClearModal = () => {
    setClearModalOpen(true);
    setClearError(null);
    setClearSuccess(null);
  };

  const handleClearActivity = async () => {
    setClearLoading(true);
    setClearError(null);
    setClearSuccess(null);
    try {
      await apiFetch("/patient/activity", { method: "DELETE" });
      setActivity([]);
      setClearSuccess("Activity log cleared.");
      setClearModalOpen(false);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Unable to clear activity.");
    } finally {
      setClearLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const response = await apiFetch<{ activity: ActivityItem[] }>("/patient/activity?limit=20");
        if (!active) return;
        setActivity(response.activity || []);
      } catch (err) {
        if (!active) return;
        setActivityError(err instanceof Error ? err.message : "Unable to load activity.");
      } finally {
        if (active) setActivityLoading(false);
      }
    };
    loadActivity();
    return () => {
      active = false;
    };
  }, []);

  const activityRows = useMemo(() => {
    const actionLabels: Record<string, string> = {
      login: "Signed in",
      register: "Account created",
      password_changed: "Password updated",
      session_revoked: "Session signed out",
      data_export_requested: "Exported data",
      journal_deletion_requested: "Journal deletion requested",
    };
    return activity.map((item) => ({
      id: item.id,
      title: actionLabels[item.action] || item.action.replace(/_/g, " "),
      detail: item.metadata?.deviceLabel ? String(item.metadata.deviceLabel) : null,
      date: new Date(item.createdAt).toLocaleString(),
    }));
  }, [activity]);

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-data-activity" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Activity controls</h3>
          <p className="mt-1 text-sm text-slate-500">
            Clear your activity history without touching journal data.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={openClearModal}>
              Clear activity log
            </Button>
            {clearSuccess ? <span className="text-sm text-emerald-600">{clearSuccess}</span> : null}
            {clearError ? <span className="text-sm text-rose-600">{clearError}</span> : null}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Activity log</h3>
          <p className="mt-1 text-sm text-slate-500">Review account access and recent changes.</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {activityLoading ? (
              <div className="rounded-2xl border px-4 py-3 text-slate-500">Loading activity…</div>
            ) : activityError ? (
              <div className="rounded-2xl border border-rose-200 px-4 py-3 text-rose-600">
                {activityError}
              </div>
            ) : activityRows.length === 0 ? (
              <div className="rounded-2xl border px-4 py-3 text-slate-500">No recent activity yet.</div>
            ) : (
              activityRows.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{event.title}</p>
                    {event.detail ? <p className="text-xs text-slate-400">{event.detail}</p> : null}
                  </div>
                  <span className="text-xs text-slate-500">{event.date}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" disabled>
              Download activity
            </Button>
          </div>
        </Card>
      </div>
      {clearModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setClearModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <Card
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-brand/20 bg-white p-6 text-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold">Clear activity log</h3>
              <p className="text-sm text-slate-500">
                This removes the activity list shown in settings. Your journal data is untouched.
              </p>
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => setClearModalOpen(false)} disabled={clearLoading}>
                  Cancel
                </Button>
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={handleClearActivity}
                  disabled={clearLoading}
                >
                  {clearLoading ? "Clearing..." : "Clear activity"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsDataActivityPage;
