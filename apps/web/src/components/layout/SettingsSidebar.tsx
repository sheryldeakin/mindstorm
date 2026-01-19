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

const settingsSections = [
  { id: "profile", label: "Profile", to: "/patient/settings/profile", icon: User },
  { id: "account-security", label: "Account & Security", to: "/patient/settings/account-security", icon: KeyRound },
  { id: "privacy-boundaries", label: "Privacy & Boundaries", to: "/patient/settings/privacy", icon: Shield },
  { id: "notifications", label: "Notifications", to: "/patient/settings/notifications", icon: Bell },
  { id: "preferences", label: "Preferences", to: "/patient/settings/preferences", icon: SlidersHorizontal },
  { id: "integrations", label: "Connected Apps", to: "/patient/settings/integrations", icon: Workflow },
  { id: "billing", label: "Billing & Plan", to: "/patient/settings/billing", icon: Wallet },
  { id: "data-activity", label: "Data & Activity", to: "/patient/settings/data-activity", icon: LayoutGrid },
  { id: "journaling-defaults", label: "Journaling Defaults", to: "/patient/settings/journaling-defaults", icon: FileText },
  { id: "sharing-access", label: "Sharing & Clinician Access", to: "/patient/settings/sharing-access", icon: BadgeCheck },
  { id: "ai-insights", label: "AI & Insights", to: "/patient/settings/ai-insights", icon: Brain },
];

const SettingsSidebar = () => {
  return (
    <aside className="hidden w-60 flex-col gap-2 lg:flex">
      <div className="ms-card ms-elev-1 p-4">
        <p className="small-label text-brand/70">Settings</p>
        <div className="mt-4 flex flex-col gap-1">
          {settingsSections.map((section) => (
            <NavLink key={section.id} to={section.to}>
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
                  <section.icon className="h-4 w-4" strokeWidth={1.6} />
                  {section.label}
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
