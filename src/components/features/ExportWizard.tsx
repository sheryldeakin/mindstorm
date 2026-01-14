import type { PatientSummarySection } from "../../types/prepare";
import Button from "../ui/Button";
import { Card } from "../ui/Card";
import PDFPreview from "./PDFPreview";
import RedactionEditor from "./RedactionEditor";
import ShareViaPortalToggle from "./ShareViaPortalToggle";
import TimeRangeSelector from "./TimeRangeSelector";

interface ExportWizardProps {
  timeRangeOptions: { id: string; label: string }[];
  activeTimeRange: string;
  onTimeRangeChange: (value: string) => void;
  topics: string[];
  redactedTopics: string[];
  quotes: { id: string; text: string }[];
  redactedQuotes: string[];
  onToggleTopic: (topic: string) => void;
  onToggleQuote: (quoteId: string) => void;
  portalEnabled: boolean;
  consentGiven: boolean;
  onPortalToggle: (value: boolean) => void;
  onConsentToggle: (value: boolean) => void;
  sections: PatientSummarySection[];
}

const ExportWizard = ({
  timeRangeOptions,
  activeTimeRange,
  onTimeRangeChange,
  topics,
  redactedTopics,
  quotes,
  redactedQuotes,
  onToggleTopic,
  onToggleQuote,
  portalEnabled,
  consentGiven,
  onPortalToggle,
  onConsentToggle,
  sections,
}: ExportWizardProps) => (
  <div className="space-y-6">
    <Card className="border-brand/15 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.4em] text-brand/60">Export + Share</p>
      <h3 className="mt-2 text-2xl font-semibold">Bring this to your clinician</h3>
      <p className="mt-2 text-sm text-slate-500">
        Preview the patient-friendly summary and control what is shared.
      </p>
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-700">Choose time range</p>
        <div className="mt-3">
          <TimeRangeSelector
            options={timeRangeOptions}
            activeId={activeTimeRange}
            onChange={onTimeRangeChange}
          />
        </div>
      </div>
    </Card>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="border-brand/15 bg-white p-6">
        <h4 className="text-lg font-semibold">Privacy controls</h4>
        <p className="mt-1 text-sm text-slate-500">Redact quotes, remove topics, and curate what is shared.</p>
        <div className="mt-5">
          <RedactionEditor
            topics={topics}
            redactedTopics={redactedTopics}
            quotes={quotes}
            redactedQuotes={redactedQuotes}
            onToggleTopic={onToggleTopic}
            onToggleQuote={onToggleQuote}
          />
        </div>
      </Card>
      <Card className="border-brand/15 bg-white p-6">
        <h4 className="text-lg font-semibold">Share options</h4>
        <p className="mt-1 text-sm text-slate-500">PDF download or portal share with consent gate.</p>
        <div className="mt-4 space-y-4">
          <ShareViaPortalToggle
            enabled={portalEnabled}
            consentGiven={consentGiven}
            onToggleEnabled={onPortalToggle}
            onToggleConsent={onConsentToggle}
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary">Download PDF</Button>
            <Button disabled={!portalEnabled || !consentGiven}>Share via portal</Button>
          </div>
        </div>
      </Card>
    </div>
    <PDFPreview sections={sections} redactedTopics={redactedTopics} redactedQuotes={redactedQuotes} />
  </div>
);

export default ExportWizard;
