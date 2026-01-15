import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/apiClient";
import type { Insight } from "../types/journal";

interface UseInsightsOptions {
  limit?: number;
}

interface UseInsightsResult {
  data: Insight[];
  loading: boolean;
  error: string | null;
  empty: boolean;
}

const useInsights = ({ limit }: UseInsightsOptions = {}): UseInsightsResult => {
  const { user, status } = useAuth();
  const [data, setData] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const query = params.toString();

    apiFetch<{ insights: Insight[] }>(query ? `/insights?${query}` : "/insights")
      .then(({ insights }) => {
        if (!isCancelled) setData(insights);
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load insights.");
          setData([]);
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
    }),
    [data, error, loading],
  );
};

export default useInsights;
