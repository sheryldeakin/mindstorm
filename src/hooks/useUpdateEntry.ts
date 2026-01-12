import { useState } from "react";
import { apiFetch } from "../lib/apiClient";
import type { JournalEntry } from "../types/journal";

const useUpdateEntry = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEntry = async (entryId: string, payload: Partial<JournalEntry>) => {
    setLoading(true);
    setError(null);
    try {
      const { entry } = await apiFetch<{ entry: JournalEntry }>(`/entries/${entryId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      await apiFetch("/insights/refresh", { method: "POST" });
      return entry;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateEntry, loading, error };
};

export default useUpdateEntry;
