import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { ClipboardList, FileSpreadsheet, Network, Stethoscope } from "lucide-react";

const clinicianNav = [
  { label: "Active Cases", to: "/clinician", icon: ClipboardList },
  { label: "Criteria Coverage", to: "/clinician/criteria", icon: FileSpreadsheet },
  { label: "Differential", to: "/clinician/differential", icon: Stethoscope },
  { label: "Logic Graph", to: "/clinician/logic-graph", icon: Network },
];

const ClinicianSidebar = () => {
  return (
    <aside className="hidden w-60 flex-col gap-2 lg:flex">
      <div className="ms-card ms-elev-1 p-4">
        <p className="small-label text-brand/70">Clinician</p>
        <div className="mt-4 flex flex-col gap-1">
          {clinicianNav.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <span
                  className={clsx(
                    "relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                    isActive ? "text-brand" : "text-brand/60 hover:text-brand",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand/60" />
                  )}
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default ClinicianSidebar;
