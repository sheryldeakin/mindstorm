import { useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { JournalEntry } from "../types/journal";

interface UseEntriesOptions {
  limit?: number;
}

interface UseEntriesResult {
  data: JournalEntry[];
  loading: boolean;
  error: string | null;
  empty: boolean;
  rawError?: PostgrestError | null;
}

const useEntries = ({ limit }: UseEntriesOptions = {}): UseEntriesResult => {
  const { user, status } = useAuth();
  const [data, setData] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<PostgrestError | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!user) {
      setData([]);
      setError(null);
      setRawError(null);
      setLoading(false);
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setRawError(null);

    supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(limit ?? 20)
      .then(({ data: rows, error: queryError }) => {
        if (isCancelled) return;
        if (queryError) {
          setError(queryError.message);
          setRawError(queryError);
          setData([]);
          return;
        }
        if (rows) {
          setData(rows as JournalEntry[]);
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [limit, status, user]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      empty: !loading && !error && data.length === 0,
      rawError,
    }),
    [data, error, loading, rawError],
  );
};

export default useEntries;
