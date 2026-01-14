import { useState } from "react";
import DataDeletionFlows from "../components/features/DataDeletionFlows";
import InsightToggles from "../components/features/InsightToggles";
import PrivacyControls from "../components/features/PrivacyControls";
import SafetyResourcePanel from "../components/features/SafetyResourcePanel";
import { Card } from "../components/ui/Card";

const availableTopics = ["Self-harm", "Substance use", "Trauma", "Relationships", "Work stress"];

const SettingsPage = () => {
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [hiddenTopics, setHiddenTopics] = useState<string[]>([]);

  const handleToggleTopic = (topic: string) => {
    setHiddenTopics((prev) =>
      prev.includes(topic) ? prev.filter((value) => value !== topic) : [...prev, topic],
    );
  };

  return (
    <div className="space-y-8 text-slate-900">
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Settings</p>
        <h2 className="mt-2 text-3xl font-semibold">Boundaries and safety</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Control insights, privacy, and how your data is shared. These settings keep your experience safe
          and predictable.
        </p>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="border-brand/15 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">About MindStorm</h3>
              <p className="mt-1 text-sm text-slate-500">What MindStorm does and doesn't do.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>MindStorm helps summarize reflections and highlight patterns over time.</li>
            <li>It does not replace clinical care or provide diagnoses.</li>
            <li>Your entries are private and only shared with explicit consent.</li>
          </ul>
        </Card>
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-lg font-semibold">Insights and topics</h3>
          <p className="mt-1 text-sm text-slate-500">Turn off insights or hide sensitive topics.</p>
          <div className="mt-4">
            <InsightToggles
              insightsEnabled={insightsEnabled}
              onToggleInsights={setInsightsEnabled}
              hiddenTopics={hiddenTopics}
              onToggleTopic={handleToggleTopic}
              topics={availableTopics}
            />
          </div>
        </Card>
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-lg font-semibold">Privacy and exports</h3>
          <p className="mt-1 text-sm text-slate-500">Export a copy of your data or manage sharing.</p>
          <div className="mt-4">
            <PrivacyControls onExportData={() => {}} onDeleteData={() => {}} />
          </div>
        </Card>
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-lg font-semibold">Data deletion</h3>
          <p className="mt-1 text-sm text-slate-500">
            Permanently remove your entries, insights, and exports.
          </p>
          <div className="mt-4">
            <DataDeletionFlows onRequestDeletion={() => {}} onConfirmDeletion={() => {}} />
          </div>
        </Card>
        <Card className="border-brand/15 bg-white p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">Safety resources</h3>
          <p className="mt-1 text-sm text-slate-500">Immediate help if you are in danger.</p>
          <div className="mt-4">
            <SafetyResourcePanel />
          </div>
        </Card>
      </section>
    </div>
  );
};

export default SettingsPage;
