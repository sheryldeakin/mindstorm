import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { Activity, BookOpen, CalendarDays, FileText, Share2, SlidersHorizontal, Sparkles } from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/patient/home", icon: CalendarDays },
  { label: "Journal Library", to: "/patient/journal", icon: BookOpen },
  { label: "New Entry", to: "/patient/entry", icon: Sparkles },
  { label: "Check-in", to: "/patient/check-in", icon: SlidersHorizontal },
  { label: "Connections", to: "/patient/connections", icon: Share2 },
  { label: "Patterns", to: "/patient/patterns", icon: Activity },
  { label: "Cycles Graph", to: "/patient/cycles", icon: Activity },
  { label: "Prepare", to: "/patient/prepare", icon: FileText },
];

const SidebarNav = () => {
  return (
    <aside className="hidden w-60 flex-col gap-2 lg:flex">
      <div className="ms-card ms-elev-1 p-4">
        <p className="small-label text-brand/70">Navigate</p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon }) => (
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

export default SidebarNav;
