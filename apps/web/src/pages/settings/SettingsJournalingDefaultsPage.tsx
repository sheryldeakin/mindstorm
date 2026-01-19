import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import PageHeader from "../../components/layout/PageHeader";

const SettingsJournalingDefaultsPage = () => {
  const { data, loading, saving, error, updateSettings } = useSettings();
  const [reminderTime, setReminderTime] = useState("20:30");
  const [promptStyle, setPromptStyle] = useState("gentle");
  const [weeklySummary, setWeeklySummary] = useState(true);

  useEffect(() => {
    const defaults = data.settings.journalingDefaults;
    setReminderTime(defaults.reminderTime || "20:30");
    setPromptStyle(defaults.promptStyle || "gentle");
    setWeeklySummary(Boolean(defaults.weeklySummary));
  }, [data.settings.journalingDefaults]);

  const isDirty = useMemo(() => {
    const defaults = data.settings.journalingDefaults;
    return (
      reminderTime !== (defaults.reminderTime || "20:30") ||
      promptStyle !== (defaults.promptStyle || "gentle") ||
      weeklySummary !== Boolean(defaults.weeklySummary)
    );
  }, [data.settings.journalingDefaults, promptStyle, reminderTime, weeklySummary]);

  const handleDiscard = () => {
    const defaults = data.settings.journalingDefaults;
    setReminderTime(defaults.reminderTime || "20:30");
    setPromptStyle(defaults.promptStyle || "gentle");
    setWeeklySummary(Boolean(defaults.weeklySummary));
  };

  const handleSave = async () => {
    await updateSettings({
      journalingDefaults: {
        promptStyle,
        reminderTime,
        weeklySummary,
      },
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-journaling-defaults" />
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Prompt style</p>
            <select
              value={promptStyle}
              onChange={(event) => setPromptStyle(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              disabled={loading}
            >
              <option value="gentle">Gentle reflection</option>
              <option value="structured">Structured prompts</option>
              <option value="freeform">Freeform check-in</option>
            </select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Daily reminder</p>
            <input
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              disabled={loading}
            />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-2xl border p-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Weekly reflection summary</p>
            <p className="text-sm text-slate-500">Receive a gentle wrap-up each week.</p>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={weeklySummary}
              onChange={(event) => setWeeklySummary(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              disabled={loading}
            />
            Enabled
          </label>
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

export default SettingsJournalingDefaultsPage;
