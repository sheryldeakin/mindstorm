import { Card } from "../components/ui/Card";

const ClinicianCriteriaPage = () => (
  <div className="space-y-6">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Clinician</p>
      <h1 className="text-3xl font-semibold text-slate-900">Criteria coverage</h1>
      <p className="text-sm text-slate-500">Coverage view for criteria-like signal clusters.</p>
    </header>
    <Card className="p-6 text-slate-700">Criteria coverage placeholder.</Card>
  </div>
);

export default ClinicianCriteriaPage;
