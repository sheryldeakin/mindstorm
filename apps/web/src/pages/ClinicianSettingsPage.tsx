import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import PageHeader from "../components/layout/PageHeader";

const clinicianSettingsCards = [
  { title: "Profile", to: "/clinician/settings/profile", description: "Name, avatar, and profile details." },
  {
    title: "Account & Security",
    to: "/clinician/settings/account-security",
    description: "Password, sessions, and security controls.",
  },
  {
    title: "Privacy & Boundaries",
    to: "/clinician/settings/privacy",
    description: "Privacy, exports, and safety resources.",
  },
  { title: "Notifications", to: "/clinician/settings/notifications", description: "Reminders and alerts." },
  { title: "Preferences", to: "/clinician/settings/preferences", description: "Language and display options." },
  { title: "Connected Apps", to: "/clinician/settings/integrations", description: "Integrations and access." },
  { title: "Billing & Plan", to: "/clinician/settings/billing", description: "Plan and invoices." },
  { title: "Data & Activity", to: "/clinician/settings/data-activity", description: "Deletion and logs." },
  {
    title: "Journaling Defaults",
    to: "/clinician/settings/journaling-defaults",
    description: "Prompts and reminders.",
  },
  {
    title: "Sharing & Clinician Access",
    to: "/clinician/settings/sharing-access",
    description: "Consent and sharing controls.",
  },
  {
    title: "AI & Insights",
    to: "/clinician/settings/ai-insights",
    description: "Insights and topic boundaries.",
  },
];

const ClinicianSettingsPage = () => {
  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="settings" />

      <section className="grid gap-6 md:grid-cols-2">
        {clinicianSettingsCards.map((card) => (
          <Card key={card.title} className="p-6">
            <Link to={card.to} className="block">
              <h3 className="text-lg font-semibold text-slate-800">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{card.description}</p>
            </Link>
          </Card>
        ))}
      </section>
    </div>
  );
};

export default ClinicianSettingsPage;
