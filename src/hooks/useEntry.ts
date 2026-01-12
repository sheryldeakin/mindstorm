import { useEffect, useState } from "react";
import { apiFetch } from "../lib/apiClient";
import type { JournalEntry } from "../types/journal";

const useEntry = (entryId: string | undefined) => {
  const [data, setData] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId) return;

    let isCancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<{ entry: JournalEntry }>(`/entries/${entryId}`)
      .then(({ entry }) => {
        if (!isCancelled) setData(entry);
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load entry.");
          setData(null);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [entryId]);

  return { data, loading, error, setData };
};

export default useEntry;
