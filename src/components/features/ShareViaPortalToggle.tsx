interface ShareViaPortalToggleProps {
  enabled: boolean;
  consentGiven: boolean;
  onToggleEnabled: (value: boolean) => void;
  onToggleConsent: (value: boolean) => void;
}

const ShareViaPortalToggle = ({
  enabled,
  consentGiven,
  onToggleEnabled,
  onToggleConsent,
}: ShareViaPortalToggleProps) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
      <span>Share via clinician portal</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onToggleEnabled(event.target.checked)}
        className="h-4 w-4 accent-brand"
      />
    </label>
    <p className="text-xs text-slate-500">
      Portal sharing adds a hidden appendix for clinical context. Specs live in the clinician portal guide.
    </p>
    <label className="flex items-start gap-3 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={consentGiven}
        onChange={(event) => onToggleConsent(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-brand"
      />
      <span>
        I consent to sharing this summary and appendix with my clinician. This will be logged.
      </span>
    </label>
  </div>
);

export default ShareViaPortalToggle;
