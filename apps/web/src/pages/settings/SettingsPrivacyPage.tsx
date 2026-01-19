import { useEffect, useMemo, useState } from "react";
import PrivacyControls from "../../components/features/PrivacyControls";
import SafetyResourcePanel from "../../components/features/SafetyResourcePanel";
import { Card } from "../../components/ui/Card";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { apiFetch, getApiUrl, getToken } from "../../lib/apiClient";
import PageHeader from "../../components/layout/PageHeader";

const SettingsPrivacyPage = () => {
  const { data, loading, saving, error, updateSettings } = useSettings();
  const [dataExportsEnabled, setDataExportsEnabled] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deletionScheduledFor = data.settings.privacy?.deletionScheduledFor;

  useEffect(() => {
    setDataExportsEnabled(Boolean(data.settings.privacy?.dataExportEnabled));
  }, [data.settings.privacy]);

  const isDirty = useMemo(
    () => dataExportsEnabled !== Boolean(data.settings.privacy?.dataExportEnabled),
    [data.settings.privacy, dataExportsEnabled],
  );

  const handleDiscard = () => {
    setDataExportsEnabled(Boolean(data.settings.privacy?.dataExportEnabled));
  };

  const handleSave = async () => {
    await updateSettings({
      privacy: {
        dataExportEnabled: dataExportsEnabled,
      },
    });
  };

  const handleExport = async () => {
    const token = getToken();
    const response = await fetch(`${getApiUrl()}/patient/settings/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Export failed.");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mindstorm-export.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteRequest = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteSuccess(null);
    try {
      await apiFetch("/patient/settings/delete-request", {
        method: "POST",
        body: JSON.stringify({ password: confirmPassword }),
      });
      setDeleteSuccess("Deletion request received. Your journal data has been archived.");
      setConfirmPassword("");
      setDeleteModalOpen(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete request failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-privacy" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Privacy and exports</h3>
          <p className="mt-1 text-sm text-slate-500">Export a copy of your data or manage sharing.</p>
          <div className="mt-4 flex items-center justify-between rounded-2xl border p-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Allow data exports</p>
              <p className="text-sm text-slate-500">Enable downloads of your full record.</p>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dataExportsEnabled}
                onChange={(event) => setDataExportsEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                disabled={loading}
              />
              Enabled
            </label>
          </div>
          <div className="mt-4">
            <PrivacyControls onExportData={handleExport} onDeleteData={() => setDeleteModalOpen(true)} />
          </div>
          {deletionScheduledFor ? (
            <p className="mt-3 text-xs text-amber-600">
              Deletion scheduled for {new Date(deletionScheduledFor).toLocaleDateString()}.
            </p>
          ) : null}
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Safety resources</h3>
          <p className="mt-1 text-sm text-slate-500">Immediate help if you are in danger.</p>
          <div className="mt-4">
            <SafetyResourcePanel />
          </div>
        </Card>
      </div>
      <SettingsSaveBar
        isDirty={isDirty}
        isSaving={saving}
        error={error}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setDeleteModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <Card
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-brand/20 bg-white p-6 text-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold">Confirm journal deletion</h3>
              <p className="text-sm text-slate-500">
                This will archive and remove all journal entries, insights, and derived data from MindStorm.
              </p>
              <p className="text-sm text-rose-600">
                This action cannot be reversed once the deletion window completes.
              </p>
              <p className="text-xs text-slate-500">
                We keep a 6-month grace period. If you do not log in during that time, your data is
                permanently deleted. If you need immediate deletion, email{" "}
                <a className="text-brand underline" href="mailto:support@mindstorm.ai">
                  support@mindstorm.ai
                </a>{" "}
                to submit a request.
              </p>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Re-enter password</p>
                <Input
                  className="mt-2"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password"
                />
              </div>
              {deleteError ? <p className="text-sm text-rose-600">{deleteError}</p> : null}
              {deleteSuccess ? <p className="text-sm text-emerald-600">{deleteSuccess}</p> : null}
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>
                  Cancel
                </Button>
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={handleDeleteRequest}
                  disabled={deleteLoading || confirmPassword.length < 8}
                >
                  {deleteLoading ? "Submitting..." : "Confirm deletion"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsPrivacyPage;
