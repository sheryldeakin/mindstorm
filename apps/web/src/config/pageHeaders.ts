export type PageHeaderConfig = {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
};

export const pageHeaders: Record<string, PageHeaderConfig> = {
  journal: {
    eyebrow: "Timeline",
    title: "Recent reflections",
  },
  "check-in": {
    eyebrow: "Check-in",
    title: "Daily signal snapshot",
    description: "Small structured signals stabilize trends when journaling alone is spiky.",
  },
  connections: {
    eyebrow: "Connections",
    title: "Relationships between signals",
    description: "Explore concurrence stats and temporal correlations across your entries.",
  },
  patterns: {
    eyebrow: "Patterns",
    title: "Your nervous system trends",
    description: "Soft gradients call out when emotions spike, soften, or correlate with habits over time.",
  },
  cycles: {
    eyebrow: "Cycles",
    title: "Cycles tracker",
    description: "Track cyclical patterns alongside your entries.",
  },
  "demo-graphs": {
    eyebrow: "Demo Graphs",
    title: "Patient-friendly visuals",
    description: "Exploratory views to help you notice patterns, influences, and life balance.",
  },
  "interactive-character": {
    eyebrow: "Interactive",
    title: "Interactive character",
    description: "Explore the Mindstorm character’s movement and reactions.",
  },
  prepare: {
    eyebrow: "Prepare",
    title: "Bring this to your clinician",
    description: "A patient-authored reflection summary focused on patterns, context, and questions.",
  },
  settings: {
    eyebrow: "Settings",
    title: "Your account and boundaries",
    description: "Personalize your experience, control how data is used, and manage how you share your reflections.",
  },
  "settings-profile": {
    eyebrow: "Profile",
    title: "Profile settings",
    description: "Update your name, avatar, and profile details.",
  },
  "settings-account-security": {
    eyebrow: "Account & Security",
    title: "Account protection",
    description: "Manage passwords, sessions, and security controls.",
  },
  "settings-privacy": {
    eyebrow: "Privacy & Boundaries",
    title: "Control your privacy",
    description: "Manage exports, sharing, and safety resources.",
  },
  "settings-notifications": {
    eyebrow: "Notifications",
    title: "Reminder preferences",
    description: "Choose how and when you want nudges.",
  },
  "settings-preferences": {
    eyebrow: "Preferences",
    title: "Personalize your experience",
    description: "Language, timezone, accessibility, and display options.",
  },
  "settings-integrations": {
    eyebrow: "Connected Apps",
    title: "Manage integrations",
    description: "Connect or revoke access for linked services.",
  },
  "settings-billing": {
    eyebrow: "Billing & Plan",
    title: "Plan and invoices",
    description: "Review plan details, invoices, and payment methods.",
  },
  "settings-data-activity": {
    eyebrow: "Data & Activity",
    title: "Data controls",
    description: "Manage deletion requests and review activity logs.",
  },
  "settings-journaling-defaults": {
    eyebrow: "Journaling Defaults",
    title: "Set your default flow",
    description: "Configure prompts, reminders, and templates.",
  },
  "settings-sharing-access": {
    eyebrow: "Sharing & Clinician Access",
    title: "Manage sharing",
    description: "Control clinician access, portal sharing, and consent history.",
  },
  "settings-ai-insights": {
    eyebrow: "AI & Insights",
    title: "Insights and boundaries",
    description: "Control the topics and insights you want to engage with.",
  },
};
