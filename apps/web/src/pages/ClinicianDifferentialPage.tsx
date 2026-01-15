import { Card } from "../components/ui/Card";

const ClinicianDifferentialPage = () => (
  <div className="space-y-6">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Clinician</p>
      <h1 className="text-3xl font-semibold text-slate-900">Differential</h1>
      <p className="text-sm text-slate-500">Compare candidate patterns and open questions.</p>
    </header>
    <Card className="p-6 text-slate-700">Differential placeholder.</Card>
  </div>
);

export default ClinicianDifferentialPage;
