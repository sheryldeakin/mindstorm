import { Outlet } from "react-router-dom";

const ClinicianShell = () => {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 w-full bg-amber-50/80 px-6 py-3 text-sm text-amber-900 backdrop-blur">
        Clinical decision support — criteria coverage, not diagnosis.
      </div>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default ClinicianShell;
