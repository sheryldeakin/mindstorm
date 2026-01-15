import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const PortalPage = () => (
  <div className="mx-auto max-w-5xl space-y-8">
    <header className="space-y-3">
      <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Portal</p>
      <h1 className="text-3xl font-semibold text-slate-900">Choose your view</h1>
      <p className="text-sm text-slate-500">
        Pick the workspace you want to enter. You can switch between patient and clinician views anytime.
      </p>
    </header>
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-6 text-slate-900">
        <h2 className="text-xl font-semibold">Patient view</h2>
        <p className="mt-2 text-sm text-slate-500">
          Journaling, patterns, and connection insights designed for personal reflection.
        </p>
        <Link to="/patient/home">
          <Button className="mt-6 w-full">Go to patient</Button>
        </Link>
      </Card>
      <Card className="p-6 text-slate-900">
        <h2 className="text-xl font-semibold">Clinician view</h2>
        <p className="mt-2 text-sm text-slate-500">
          Criteria coverage and synthesized summaries for clinical discussion.
        </p>
        <Link to="/clinician">
          <Button variant="secondary" className="mt-6 w-full">Go to clinician</Button>
        </Link>
      </Card>
    </div>
  </div>
);

export default PortalPage;
