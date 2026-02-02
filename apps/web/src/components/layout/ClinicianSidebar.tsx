import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { ClipboardList, FileSpreadsheet, Network, Scale, Stethoscope, Sparkles } from "lucide-react";

const clinicianNav = [
  { label: "Active Cases", to: "/clinician", icon: ClipboardList },
  { label: "Criteria Coverage", to: "/clinician/criteria", icon: FileSpreadsheet },
  { label: "Differential", to: "/clinician/differential", icon: Stethoscope },
  { label: "Differential Eval", to: "/clinician/differential-eval", icon: Scale },
  { label: "Logic Graph", to: "/clinician/logic-graph", icon: Network },
];

/** Clinician-Facing: navigation sidebar for clinician workspace. */
type ClinicianSidebarProps = {
  collapsed?: boolean;
};

const ClinicianSidebar = ({ collapsed = false }: ClinicianSidebarProps) => {
  const { pathname } = useLocation();
  const caseMatch = pathname.match(/^\/clinician\/cases\/([^/]+)/);
  const caseId = caseMatch?.[1];
  const navItems = caseId
    ? [
        ...clinicianNav,
        { label: "Patient Hub", to: `/clinician/cases/${caseId}/hub`, icon: Sparkles },
        { label: "Therapist Cockpit", to: `/clinician/cases/${caseId}/cockpit`, icon: Sparkles },
        { label: "Therapist Cockpit Sample", to: `/clinician/cases/${caseId}/cockpit-sample`, icon: Sparkles },
      ]
    : clinicianNav;

  return (
    <aside className={clsx("hidden flex-col gap-2 lg:flex", collapsed ? "w-16" : "w-60")}>
      <div className={clsx("ms-card ms-elev-1 p-4", collapsed && "px-2")}>
        <p className={clsx("small-label text-brand/70", collapsed && "sr-only")}>Clinician</p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <span
                  className={clsx(
                    "relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                    collapsed && "justify-center px-2",
                    isActive ? "text-brand" : "text-brand/60 hover:text-brand",
                  )}
                  >
                  {isActive && (
                    <span className="absolute left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand/60" />
                  )}
                  <Icon className="h-4 w-4" strokeWidth={1.6} />
                  <span className={clsx(collapsed && "sr-only")}>{label}</span>
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
