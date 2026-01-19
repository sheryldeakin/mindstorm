import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import SidebarNav from "./SidebarNav";
import SettingsSidebar from "./SettingsSidebar";
import useSettings from "../../hooks/useSettings";

const AppShell = () => {
  const { pathname } = useLocation();
  const showSettingsSidebar = pathname.startsWith("/patient/settings");
  useSettings();

  return (
    <div className="min-h-screen">
      <Navbar variant="app" />
      <main className="mx-auto flex w-full max-w-6xl gap-10 px-6 py-12">
        {showSettingsSidebar ? <SettingsSidebar /> : <SidebarNav />}
        <section className="flex-1">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AppShell;
