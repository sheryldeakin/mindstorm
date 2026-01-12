import { useState } from "react";
import { apiFetch } from "../lib/apiClient";

const useDeleteEntry = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteEntry = async (entryId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/entries/${entryId}`, { method: "DELETE" });
      await apiFetch("/insights/refresh", { method: "POST" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteEntry, loading, error };
};

export default useDeleteEntry;
