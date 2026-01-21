import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  BadgeCheck,
  Bell,
  Brain,
  FileText,
  KeyRound,
  LayoutGrid,
  Shield,
  SlidersHorizontal,
  User,
  Wallet,
  Workflow,
} from "lucide-react";

/** Shared UI: settings navigation used in patient and clinician shells. */
type SettingsSidebarProps = {
  basePath?: string;
  collapsed?: boolean;
};

const buildSettingsSections = (basePath: string) => [
  { id: "profile", label: "Profile", to: `${basePath}/profile`, icon: User },
  { id: "account-security", label: "Account & Security", to: `${basePath}/account-security`, icon: KeyRound },
  { id: "privacy-boundaries", label: "Privacy & Boundaries", to: `${basePath}/privacy`, icon: Shield },
  { id: "notifications", label: "Notifications", to: `${basePath}/notifications`, icon: Bell },
  { id: "preferences", label: "Preferences", to: `${basePath}/preferences`, icon: SlidersHorizontal },
  { id: "integrations", label: "Connected Apps", to: `${basePath}/integrations`, icon: Workflow },
  { id: "billing", label: "Billing & Plan", to: `${basePath}/billing`, icon: Wallet },
  { id: "data-activity", label: "Data & Activity", to: `${basePath}/data-activity`, icon: LayoutGrid },
  { id: "journaling-defaults", label: "Journaling Defaults", to: `${basePath}/journaling-defaults`, icon: FileText },
  { id: "sharing-access", label: "Sharing & Clinician Access", to: `${basePath}/sharing-access`, icon: BadgeCheck },
  { id: "ai-insights", label: "AI & Insights", to: `${basePath}/ai-insights`, icon: Brain },
];

const SettingsSidebar = ({ basePath = "/patient/settings", collapsed = false }: SettingsSidebarProps) => {
  const settingsSections = buildSettingsSections(basePath);
  return (
    <aside className={clsx("hidden flex-col gap-2 lg:flex", collapsed ? "w-16" : "w-60")}>
      <div className={clsx("ms-card ms-elev-1 p-4", collapsed && "px-2")}>
        <p className={clsx("small-label text-brand/70", collapsed && "sr-only")}>Settings</p>
        <div className="mt-4 flex flex-col gap-1">
          {settingsSections.map((section) => (
            <NavLink key={section.id} to={section.to}>
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
                  <section.icon className="h-4 w-4" strokeWidth={1.6} />
                  <span className={clsx(collapsed && "sr-only")}>{section.label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
