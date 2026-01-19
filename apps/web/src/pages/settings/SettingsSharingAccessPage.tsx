import { useEffect, useMemo, useState } from "react";
import ShareViaPortalToggle from "../../components/features/ShareViaPortalToggle";
import { Card } from "../../components/ui/Card";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import PageHeader from "../../components/layout/PageHeader";

const SettingsSharingAccessPage = () => {
  const { data, loading, saving, error, updateSettings } = useSettings();
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const sharing = data.settings.sharingAccess;
    setPortalEnabled(Boolean(sharing.portalEnabled));
    setConsentGiven(Boolean(sharing.consentGiven));
  }, [data.settings.sharingAccess]);

  const isDirty = useMemo(() => {
    const sharing = data.settings.sharingAccess;
    return (
      portalEnabled !== Boolean(sharing.portalEnabled) ||
      consentGiven !== Boolean(sharing.consentGiven)
    );
  }, [consentGiven, data.settings.sharingAccess, portalEnabled]);

  const handleDiscard = () => {
    const sharing = data.settings.sharingAccess;
    setPortalEnabled(Boolean(sharing.portalEnabled));
    setConsentGiven(Boolean(sharing.consentGiven));
  };

  const handleSave = async () => {
    await updateSettings({
      sharingAccess: {
        portalEnabled,
        consentGiven,
      },
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-sharing-access" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Share via clinician portal</h3>
          <p className="mt-1 text-sm text-slate-500">
            Control when reflections are shared and ensure consent is explicit.
          </p>
          <div className="mt-4">
            <ShareViaPortalToggle
              enabled={portalEnabled}
              consentGiven={consentGiven}
              onToggleEnabled={loading ? () => {} : setPortalEnabled}
              onToggleConsent={loading ? () => {} : setConsentGiven}
            />
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Shared clinicians</h3>
          <p className="mt-1 text-sm text-slate-500">People with access to your summaries.</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            {["No clinicians connected yet."].map((item) => (
              <div key={item} className="rounded-2xl border px-4 py-3">
                {item}
              </div>
            ))}
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

export default SettingsSharingAccessPage;
