import { Card } from "../components/ui/Card";

const ClinicianDashboardPage = () => (
  <div className="space-y-6">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Clinician</p>
      <h1 className="text-3xl font-semibold text-slate-900">Clinician dashboard</h1>
      <p className="text-sm text-slate-500">Overview of patient-facing signals and coverage summaries.</p>
    </header>
    <Card className="p-6 text-slate-700">
      Clinician dashboard placeholder. Wire this to derived exports and criteria coverage when ready.
    </Card>
  </div>
);

export default ClinicianDashboardPage;
