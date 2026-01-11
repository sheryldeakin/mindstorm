import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { JournalEntry } from "../types/journal";

interface CreateEntryInput {
  title: string;
  summary: string;
  tags: string[];
  emotions?: JournalEntry["emotions"];
}

const useCreateEntry = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createEntry = useCallback(
    async ({ title, summary, tags, emotions = [] }: CreateEntryInput) => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      if (!user) {
        setLoading(false);
        setError("You need to be logged in to save an entry.");
        return;
      }

      if (!supabase || !isSupabaseConfigured) {
        setLoading(false);
        setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        return;
      }

      const entryDate = new Date();
      const friendlyDate = entryDate.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      const { error: insertError } = await supabase.from("entries").insert({
        user_id: user.id,
        date: friendlyDate,
        title,
        summary,
        tags,
        emotions,
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    },
    [user],
  );

  return { createEntry, loading, error, success, setSuccess };
};

export default useCreateEntry;
