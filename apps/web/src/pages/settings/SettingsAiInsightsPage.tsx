import { useEffect, useMemo, useState } from "react";
import InsightToggles from "../../components/features/InsightToggles";
import { Card } from "../../components/ui/Card";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import PageHeader from "../../components/layout/PageHeader";

const availableTopics = ["Self-harm", "Substance use", "Trauma", "Relationships", "Work stress"];

const SettingsAiInsightsPage = () => {
  const { data, loading, saving, error, updateSettings } = useSettings();
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [hiddenTopics, setHiddenTopics] = useState<string[]>([]);
  const [dataRetention, setDataRetention] = useState(true);
  const [explanationsEnabled, setExplanationsEnabled] = useState(true);

  const handleToggleTopic = (topic: string) => {
    setHiddenTopics((prev) =>
      prev.includes(topic) ? prev.filter((value) => value !== topic) : [...prev, topic],
    );
  };

  useEffect(() => {
    const ai = data.settings.aiInsights;
    setInsightsEnabled(Boolean(ai.insightsEnabled));
    setHiddenTopics(ai.hiddenTopics || []);
    setDataRetention(Boolean(ai.dataRetention));
    setExplanationsEnabled(Boolean(ai.explanationsEnabled));
  }, [data.settings.aiInsights]);

  const isDirty = useMemo(() => {
    const ai = data.settings.aiInsights;
    return (
      insightsEnabled !== Boolean(ai.insightsEnabled) ||
      dataRetention !== Boolean(ai.dataRetention) ||
      explanationsEnabled !== Boolean(ai.explanationsEnabled) ||
      JSON.stringify(hiddenTopics) !== JSON.stringify(ai.hiddenTopics || [])
    );
  }, [data.settings.aiInsights, dataRetention, explanationsEnabled, hiddenTopics, insightsEnabled]);

  const handleDiscard = () => {
    const ai = data.settings.aiInsights;
    setInsightsEnabled(Boolean(ai.insightsEnabled));
    setHiddenTopics(ai.hiddenTopics || []);
    setDataRetention(Boolean(ai.dataRetention));
    setExplanationsEnabled(Boolean(ai.explanationsEnabled));
  };

  const handleSave = async () => {
    await updateSettings({
      aiInsights: {
        insightsEnabled,
        hiddenTopics,
        dataRetention,
        explanationsEnabled,
      },
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-ai-insights" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Insights and topics</h3>
          <p className="mt-1 text-sm text-slate-500">Turn off insights or hide sensitive topics.</p>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            AI insight controls are coming soon. These settings are read-only for now.
          </div>
          <div className="mt-4 opacity-50 pointer-events-none">
            <InsightToggles
              insightsEnabled={insightsEnabled}
              onToggleInsights={loading ? () => {} : setInsightsEnabled}
              hiddenTopics={hiddenTopics}
              onToggleTopic={loading ? () => {} : handleToggleTopic}
              topics={availableTopics}
            />
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">About MindStorm</h3>
          <p className="mt-1 text-sm text-slate-500">What MindStorm does and doesn't do.</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>MindStorm helps summarize reflections and highlight patterns over time.</li>
            <li>It does not replace clinical care or provide diagnoses.</li>
            <li>Your entries are private and only shared with explicit consent.</li>
          </ul>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">AI data controls</h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose how AI-generated signals are stored and explained.
          </p>
          <div className="mt-4 space-y-4 opacity-50 pointer-events-none">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Store AI signals</p>
                <p className="text-sm text-slate-500">Keep evidence signals for continuity.</p>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={dataRetention}
                  onChange={(event) => setDataRetention(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  disabled
                />
                Enabled
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Show explanation notes</p>
                <p className="text-sm text-slate-500">Add context about how insights are formed.</p>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={explanationsEnabled}
                  onChange={(event) => setExplanationsEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  disabled
                />
                Enabled
              </label>
            </div>
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
    </div>
  );
};

export default SettingsAiInsightsPage;
