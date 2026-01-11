import { useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { Insight } from "../types/journal";

interface UseInsightsOptions {
  limit?: number;
}

interface UseInsightsResult {
  data: Insight[];
  loading: boolean;
  error: string | null;
  empty: boolean;
  rawError?: PostgrestError | null;
}

const useInsights = ({ limit }: UseInsightsOptions = {}): UseInsightsResult => {
  const { user, status } = useAuth();
  const [data, setData] = useState<Insight[]>([]);
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
      .from("insights")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10)
      .then(({ data: rows, error: queryError }) => {
        if (isCancelled) return;
        if (queryError) {
          setError(queryError.message);
          setRawError(queryError);
          setData([]);
          return;
        }
        if (rows) {
          setData(rows as Insight[]);
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

export default useInsights;
