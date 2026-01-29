import { NavLink } from "react-router-dom";
import { useState } from "react";
import clsx from "clsx";
import {
  Activity,
  BookOpen,
  CalendarDays,
  FileText,
  LayoutGrid,
  Share2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";

const navItems = [
  { label: "Home", to: "/patient/home-snapshot", icon: LayoutGrid },
  { label: "New Entry", to: "/patient/entry", icon: Sparkles },
  { label: "Check-in", to: "/patient/check-in", icon: SlidersHorizontal },
  { label: "Journal Library", to: "/patient/journal", icon: BookOpen },
  { label: "Connections", to: "/patient/connections", icon: Share2 },
  { label: "Cycles", to: "/patient/cycles", icon: Activity },
  { label: "Patterns", to: "/patient/patterns", icon: Activity },
  { label: "Prepare", to: "/patient/prepare", icon: FileText },
];

const alternativeItems = [
  { label: "Dashboard", to: "/patient/home", icon: CalendarDays },
  { label: "Demo Graphs", to: "/patient/demo-graphs", icon: LayoutGrid },
  { label: "Demo Graphs Lab", to: "/patient/demo-graphs-lab", icon: LayoutGrid },
  { label: "Interactive Character", to: "/patient/interactive-character", icon: UserRound },
];

/** Patient-Facing: sidebar navigation for patient dashboard pages. */
type SidebarNavProps = {
  collapsed?: boolean;
};

const SidebarNav = ({ collapsed = false }: SidebarNavProps) => {
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  return (
    <aside className={clsx("hidden flex-col gap-2 lg:flex", collapsed ? "w-16" : "w-60")}>
      <div className={clsx("ms-card ms-elev-1 p-4", collapsed && "px-2")}>
        <p className={clsx("small-label text-brand/70", collapsed && "sr-only")}>Navigate</p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to + label} to={to}>
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
        <div className={clsx("mt-4", collapsed && "hidden")}>
          <button
            type="button"
            onClick={() => setAlternativesOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold text-brand/70 hover:text-brand"
          >
            <span>Alternatives + Experiements</span>
            <span className={clsx("transition-transform", alternativesOpen ? "rotate-180" : "")}>▾</span>
          </button>
          {alternativesOpen && (
            <div className="mt-1 flex flex-col gap-1">
              {alternativeItems.map(({ label, to, icon: Icon }) => (
                <NavLink key={to + label} to={to}>
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
                      <span>{label}</span>
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
