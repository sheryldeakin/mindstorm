import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import type { SettingsResponse, UserSettings } from "../types/settings";

const defaultSettings: UserSettings = {
  notifications: {
    entryReminders: true,
    emailDigest: true,
    weeklyCheckins: false,
    pushEnabled: false,
  },
  preferences: {
    language: "en",
    timezone: "America/Los_Angeles",
    theme: "system",
    reducedMotion: false,
    textSize: "medium",
  },
  journalingDefaults: {
    promptStyle: "gentle",
    reminderTime: "20:30",
    weeklySummary: true,
  },
  sharingAccess: {
    portalEnabled: false,
    consentGiven: false,
  },
  aiInsights: {
    insightsEnabled: true,
    hiddenTopics: [],
    dataRetention: true,
    explanationsEnabled: true,
  },
  privacy: {
    dataExportEnabled: true,
    deletionRequestedAt: null,
    deletionScheduledFor: null,
  },
  security: {
    twoFactorEnabled: false,
  },
};

const defaultProfile = {
  displayName: "",
  username: "",
  bio: "",
  avatarUrl: "",
};

let settingsCache: SettingsResponse | null = null;
let settingsRequest: Promise<SettingsResponse> | null = null;

const applyPreferencesToDocument = (preferences: UserSettings["preferences"]) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (preferences?.textSize) {
    root.dataset.textSize = preferences.textSize;
  }
  if (preferences?.reducedMotion !== undefined) {
    root.dataset.reducedMotion = preferences.reducedMotion ? "true" : "false";
  }
  if (preferences?.theme) {
    root.dataset.theme = preferences.theme;
  }
  if (preferences?.language) {
    root.lang = preferences.language;
  }
};

const useSettings = () => {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    if (settingsCache) {
      setData(settingsCache);
      setLoading(false);
      return;
    }
    if (!settingsRequest) {
      settingsRequest = apiFetch<SettingsResponse>("/patient/settings");
    }
    settingsRequest
      .then((response) => {
        settingsCache = response;
        setData(response);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings.");
      })
      .finally(() => {
        setLoading(false);
        settingsRequest = null;
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const preferences = (data?.settings || defaultSettings).preferences;
    applyPreferencesToDocument(preferences);
  }, [data]);

  const updateSettings = useCallback(async (patch: Partial<SettingsResponse>) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiFetch<SettingsResponse>("/patient/settings", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      settingsCache = response;
      setData(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    data: data || { profile: defaultProfile, settings: defaultSettings },
    loading,
    saving,
    error,
    refresh,
    updateSettings,
  };
};

export default useSettings;
