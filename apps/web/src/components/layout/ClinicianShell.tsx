import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import ClinicianSidebar from "./ClinicianSidebar";
import Navbar from "./Navbar";
import SettingsSidebar from "./SettingsSidebar";

const ClinicianShell = () => {
  const { pathname } = useLocation();
  const showSettingsSidebar = pathname.startsWith("/clinician/settings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          <div className="hidden flex-col gap-2 lg:flex">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm transition hover:border-slate-300"
              aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              {sidebarCollapsed ? "Expand" : "Collapse"}
            </button>
            {showSettingsSidebar ? (
              <SettingsSidebar basePath="/clinician/settings" collapsed={sidebarCollapsed} />
            ) : (
              <ClinicianSidebar collapsed={sidebarCollapsed} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClinicianShell;
