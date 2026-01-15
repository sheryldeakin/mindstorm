import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { Activity, BookOpen, CalendarDays, FileText, Settings, Share2, SlidersHorizontal, Sparkles } from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: CalendarDays },
  { label: "Journal Library", to: "/journal", icon: BookOpen },
  { label: "New Entry", to: "/entry", icon: Sparkles },
  { label: "Check-in", to: "/check-in", icon: SlidersHorizontal },
  { label: "Connections", to: "/connections", icon: Share2 },
  { label: "Patterns", to: "/patterns", icon: Activity },
  { label: "Cycles Graph", to: "/cycles", icon: Activity },
  { label: "Prepare", to: "/prepare", icon: FileText },
  { label: "Settings", to: "/settings", icon: Settings },
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
