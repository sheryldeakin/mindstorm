import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import SidebarNav from "./SidebarNav";

const AppShell = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-brand/5">
      <Navbar variant="app" />
      <main className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-10">
        <SidebarNav />
        <section className="flex-1">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AppShell;
