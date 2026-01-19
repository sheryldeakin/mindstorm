import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import PageHeader from "../../components/layout/PageHeader";

const SettingsPreferencesPage = () => {
  const { data, loading, saving, error, updateSettings } = useSettings();
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [theme, setTheme] = useState("system");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [textSize, setTextSize] = useState("medium");

  useEffect(() => {
    const preferences = data.settings.preferences;
    setLanguage(preferences.language || "en");
    setTimezone(preferences.timezone || "America/Los_Angeles");
    setTheme(preferences.theme || "system");
    setReducedMotion(Boolean(preferences.reducedMotion));
    setTextSize(preferences.textSize || "medium");
  }, [data.settings.preferences]);

  const isDirty = useMemo(() => {
    const preferences = data.settings.preferences;
    return (
      language !== (preferences.language || "en") ||
      timezone !== (preferences.timezone || "America/Los_Angeles") ||
      theme !== (preferences.theme || "system") ||
      reducedMotion !== Boolean(preferences.reducedMotion) ||
      textSize !== (preferences.textSize || "medium")
    );
  }, [data.settings.preferences, language, reducedMotion, textSize, theme, timezone]);

  const handleDiscard = () => {
    const preferences = data.settings.preferences;
    setLanguage(preferences.language || "en");
    setTimezone(preferences.timezone || "America/Los_Angeles");
    setTheme(preferences.theme || "system");
    setReducedMotion(Boolean(preferences.reducedMotion));
    setTextSize(preferences.textSize || "medium");
  };

  const handleSave = async () => {
    await updateSettings({
      preferences: {
        language,
        timezone,
        theme,
        reducedMotion,
        textSize,
      },
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-preferences" />
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Language</p>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500"
              disabled
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Timezone</p>
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              disabled={loading}
            >
              <option value="America/Los_Angeles">Pacific Time (US)</option>
              <option value="America/Chicago">Central Time (US)</option>
              <option value="America/New_York">Eastern Time (US)</option>
            </select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Theme</p>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-500"
              disabled
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Text size</p>
            <select
              value={textSize}
              onChange={(event) => setTextSize(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              disabled={loading}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-2xl border p-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Reduce motion</p>
            <p className="text-sm text-slate-500">Minimize animations and transitions.</p>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
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

export default SettingsPreferencesPage;
