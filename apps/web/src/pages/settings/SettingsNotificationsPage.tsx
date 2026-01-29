import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import PageHeader from "../../components/layout/PageHeader";

const SettingsNotificationsPage = () => {
  const { data, saving, error, updateSettings } = useSettings();
  const [emailDigest, setEmailDigest] = useState(true);
  const [entryReminders, setEntryReminders] = useState(true);
  const [weeklyCheckins, setWeeklyCheckins] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    const notifications = data.settings.notifications;
    setEmailDigest(Boolean(notifications.emailDigest));
    setEntryReminders(Boolean(notifications.entryReminders));
    setWeeklyCheckins(Boolean(notifications.weeklyCheckins));
    setPushEnabled(Boolean(notifications.pushEnabled));
  }, [data.settings.notifications]);

  const isDirty = useMemo(() => {
    const notifications = data.settings.notifications;
    return (
      emailDigest !== Boolean(notifications.emailDigest) ||
      entryReminders !== Boolean(notifications.entryReminders) ||
      weeklyCheckins !== Boolean(notifications.weeklyCheckins) ||
      pushEnabled !== Boolean(notifications.pushEnabled)
    );
  }, [data.settings.notifications, emailDigest, entryReminders, pushEnabled, weeklyCheckins]);

  const handleDiscard = () => {
    const notifications = data.settings.notifications;
    setEmailDigest(Boolean(notifications.emailDigest));
    setEntryReminders(Boolean(notifications.entryReminders));
    setWeeklyCheckins(Boolean(notifications.weeklyCheckins));
    setPushEnabled(Boolean(notifications.pushEnabled));
  };

  const handleSave = async () => {
    await updateSettings({
      notifications: {
        emailDigest,
        entryReminders,
        weeklyCheckins,
        pushEnabled,
      },
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-notifications" />
      <Card className="p-6">
        <div className="mb-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Notifications are coming soon. Settings are read-only for now.
        </div>
        <div className="space-y-4 opacity-50">
          {[
            {
              id: "entry-reminders",
              label: "Entry reminders",
              description: "Gentle nudges to keep your journaling streak.",
              value: entryReminders,
              onChange: setEntryReminders,
            },
            {
              id: "email-digest",
              label: "Weekly email digest",
              description: "Summary of patterns and highlights.",
              value: emailDigest,
              onChange: setEmailDigest,
            },
            {
              id: "weekly-checkins",
              label: "Weekly check-in prompts",
              description: "Short prompts to reflect on your week.",
              value: weeklyCheckins,
              onChange: setWeeklyCheckins,
            },
            {
              id: "push",
              label: "Push notifications",
              description: "Enable notifications on mobile devices.",
              value: pushEnabled,
              onChange: setPushEnabled,
            },
          ].map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={item.value}
                  onChange={(event) => item.onChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  disabled
                />
                Enabled
              </label>
            </div>
          ))}
        </div>
      </Card>
      <SettingsSaveBar
        isDirty={isDirty}
        isSaving={saving}
        error={error}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
};

export default SettingsNotificationsPage;
