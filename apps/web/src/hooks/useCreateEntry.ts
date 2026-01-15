import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/apiClient";
import type { JournalEntry } from "../types/journal";

interface CreateEntryInput {
  title: string;
  summary: string;
  tags: string[];
  emotions?: JournalEntry["emotions"];
  themeIntensities?: JournalEntry["themeIntensities"];
  date?: string;
  triggers?: string[];
  themes?: string[];
}

const useCreateEntry = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createEntry = useCallback(
    async ({ title, summary, tags, emotions = [], themeIntensities = [], date, triggers = [], themes = [] }: CreateEntryInput) => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      if (!user) {
        setLoading(false);
        setError("You need to be logged in to save an entry.");
        return;
      }

      try {
        const { entry } = await apiFetch<{ entry: JournalEntry }>("/entries", {
          method: "POST",
          body: JSON.stringify({ title, summary, tags, emotions, themeIntensities, date, triggers, themes }),
        });

        await apiFetch("/insights/refresh", { method: "POST" });
        setSuccess(true);
        return entry;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save entry.");
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  return { createEntry, loading, error, success, setSuccess };
};

export default useCreateEntry;
