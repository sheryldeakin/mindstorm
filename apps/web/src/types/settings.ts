export interface SettingsProfile {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
}

export interface NotificationSettings {
  entryReminders: boolean;
  emailDigest: boolean;
  weeklyCheckins: boolean;
  pushEnabled: boolean;
}

export interface PreferenceSettings {
  language: string;
  timezone: string;
  theme: string;
  reducedMotion: boolean;
  textSize: string;
}

export interface JournalingDefaultSettings {
  promptStyle: string;
  reminderTime: string;
  weeklySummary: boolean;
}

export interface SharingAccessSettings {
  portalEnabled: boolean;
  consentGiven: boolean;
}

export interface AiInsightSettings {
  insightsEnabled: boolean;
  hiddenTopics: string[];
  dataRetention: boolean;
  explanationsEnabled: boolean;
}

export interface PrivacySettings {
  dataExportEnabled: boolean;
  deletionRequestedAt?: string | null;
  deletionScheduledFor?: string | null;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
}

export interface UserSettings {
  notifications: NotificationSettings;
  preferences: PreferenceSettings;
  journalingDefaults: JournalingDefaultSettings;
  sharingAccess: SharingAccessSettings;
  aiInsights: AiInsightSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
}

export interface SettingsResponse {
  profile: SettingsProfile;
  settings: UserSettings;
}
