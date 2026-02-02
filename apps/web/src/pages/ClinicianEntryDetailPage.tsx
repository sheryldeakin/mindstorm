import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import RiskBadge from "../components/clinician/RiskBadge";
import { ClinicalCaseProvider, useClinicalCase } from "../contexts/ClinicalCaseContext";

const ClinicianEntryDetailPageContent = () => {
  const { caseId, entryId } = useParams();
  const { entries, userName, loading, error } = useClinicalCase();

  const entry = entries.find((item) => item.id === entryId);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading entry…</div>;
  if (error) return <div className="p-10 text-center text-rose-500">{error}</div>;
  if (!entry) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        Entry not found for this case.
      </Card>
    );
  }

  return (
    <div className="page-container space-y-6 pb-20">
      <Link
        to={`/clinician/cases/${caseId}/hub`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to Patient Hub
      </Link>

      <PageHeader
        eyebrow="Session Entry"
        title={userName}
        description={entry.dateISO}
        actions={<RiskBadge risk={entry.risk_signal} />}
      />

      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900">
          {entry.title || "Session Note"}
        </h3>
        {entry.summary ? (
          <p className="mt-2 text-sm text-slate-600">{entry.summary}</p>
        ) : null}
        {entry.body ? (
          <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{entry.body}</p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No narrative text recorded.</p>
        )}
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-semibold text-slate-800">Extracted Evidence</h4>
        {entry.evidenceUnits?.length ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {entry.evidenceUnits.map((unit, idx) => (
              <li key={`${unit.label}-${idx}`} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {unit.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {unit.attributes?.polarity || "UNKNOWN"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">“{unit.span}”</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No evidence units extracted.</p>
        )}
      </Card>
    </div>
  );
};

const ClinicianEntryDetailPage = () => {
  const { caseId } = useParams();
  if (!caseId) {
    return <Card className="p-6 text-sm text-slate-500">Select a case to begin.</Card>;
  }
  return (
    <ClinicalCaseProvider caseId={caseId}>
      <ClinicianEntryDetailPageContent />
    </ClinicalCaseProvider>
  );
};

export default ClinicianEntryDetailPage;
