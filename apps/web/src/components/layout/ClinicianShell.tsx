import { Outlet, useLocation } from "react-router-dom";
import ClinicianSidebar from "./ClinicianSidebar";
import Navbar from "./Navbar";
import SettingsSidebar from "./SettingsSidebar";

const ClinicianShell = () => {
  const { pathname } = useLocation();
  const showSettingsSidebar = pathname.startsWith("/clinician/settings");

  return (
    <div className="min-h-screen">
      <Navbar variant="clinician" />
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mt-4 rounded-2xl bg-amber-50/80 px-4 py-3 text-sm text-amber-900 backdrop-blur">
          Clinical decision support — criteria coverage, not diagnosis.
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex gap-8">
          {showSettingsSidebar ? <SettingsSidebar basePath="/clinician/settings" /> : <ClinicianSidebar />}
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClinicianShell;
