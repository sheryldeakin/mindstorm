import { useParams } from "react-router-dom";
import { ClinicalCaseProvider } from "../contexts/ClinicalCaseContext";
import { Card } from "../components/ui/Card";
import ClinicalDashboardPage from "./ClinicalDashboardPage";

const ClinicianCockpitPage = () => {
  const { userId } = useParams();
  if (!userId) {
    return <Card className="p-6 text-sm text-slate-500">Select a case to begin.</Card>;
  }
  return (
    <ClinicalCaseProvider caseId={userId}>
      <ClinicalDashboardPage />
    </ClinicalCaseProvider>
  );
};

export default ClinicianCockpitPage;
