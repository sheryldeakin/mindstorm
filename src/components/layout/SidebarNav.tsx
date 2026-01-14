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
      <div className="rounded-3xl border border-brand/10 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-brand/60">Navigate</p>
        <div className="mt-4 flex flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to + label}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                  isActive ? "bg-brand/10 text-brand shadow-sm border border-transparent" : "text-brand/60 hover:bg-brand/5",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
