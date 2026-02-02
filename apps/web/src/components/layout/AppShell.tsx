import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import Navbar from "./Navbar";
import SidebarNav from "./SidebarNav";
import SettingsSidebar from "./SettingsSidebar";
import useSettings from "../../hooks/useSettings";

const AppShell = () => {
  const { pathname } = useLocation();
  const showSettingsSidebar = pathname.startsWith("/patient/settings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useSettings();

  return (
    <div className="min-h-screen">
      <Navbar variant="app" />
      <main className="page-container flex gap-10 px-6 py-12">
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
            <SettingsSidebar collapsed={sidebarCollapsed} />
          ) : (
            <SidebarNav collapsed={sidebarCollapsed} />
          )}
        </div>
        <section className="flex-1">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AppShell;
