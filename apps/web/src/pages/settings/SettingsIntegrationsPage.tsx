import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/layout/PageHeader";

const SettingsIntegrationsPage = () => {
  const integrations = [
    { name: "Google Calendar", status: "Not connected" },
    { name: "Apple Health", status: "Not connected" },
    { name: "Notion", status: "Connected" },
    { name: "Slack", status: "Not connected" },
  ];

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-integrations" />
      <Card className="p-6">
        <div className="mb-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          Integrations are coming soon. Connect flows are disabled for now.
        </div>
        <div className="space-y-3 opacity-50">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">{integration.name}</p>
                <p className="text-xs text-slate-500">{integration.status}</p>
              </div>
              <Button variant={integration.status === "Connected" ? "secondary" : "primary"} size="sm" disabled>
                {integration.status === "Connected" ? "Manage" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SettingsIntegrationsPage;
