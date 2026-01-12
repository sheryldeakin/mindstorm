import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/apiClient";
import type { JournalEntry } from "../types/journal";

interface UseEntriesOptions {
  limit?: number;
  offset?: number;
}

interface UseEntriesResult {
  data: JournalEntry[];
  loading: boolean;
  error: string | null;
  empty: boolean;
  total?: number;
}

const useEntries = ({ limit, offset }: UseEntriesOptions = {}): UseEntriesResult => {
  const { user, status } = useAuth();
  const [data, setData] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (status === "loading") return;

    if (!user) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    const query = params.toString();

    apiFetch<{ entries: JournalEntry[]; total?: number }>(query ? `/entries?${query}` : "/entries")
      .then(({ entries, total }) => {
        if (!isCancelled) setData(entries);
        if (!isCancelled && typeof total === "number") {
          setTotal(total);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load entries.");
          setData([]);
          setTotal(undefined);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [limit, offset, status, user]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      empty: !loading && !error && data.length === 0,
      total,
    }),
    [data, error, loading, total],
  );
};

export default useEntries;
