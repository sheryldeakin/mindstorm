import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InsightPanel from "../components/features/InsightPanel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Textarea from "../components/ui/Textarea";
import { useAuth } from "../contexts/AuthContext";
import useCreateEntry from "../hooks/useCreateEntry";
import { analyzeEntryText } from "../lib/analyzeEntry";

const EntryEditorPage = () => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const { createEntry, loading, error, success, setSuccess } = useCreateEntry();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      setTimeout(() => setSuccess(false), 2000);
      navigate("/journal");
    }
  }, [navigate, setSuccess, success]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!summary && !title) {
      setAnalysisError("Add some reflection text first.");
      return;
    }
    setAnalysisError(null);
    setAnalyzing(true);
    try {
      const analysis = await analyzeEntryText([title, summary].filter(Boolean).join(". "));
      const combinedTags = new Set<string>();
      analysis.tags?.forEach((tag) => combinedTags.add(tag));
      analysis.triggers?.forEach((trigger) => combinedTags.add(trigger));
      const emotions = analysis.emotions || [];

      await createEntry({
        title: title || "Untitled reflection",
        summary,
        tags: Array.from(combinedTags),
        emotions,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not analyze entry.";
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Card className="lg:col-span-2 border border-brand/15 bg-white p-8 text-slate-900 shadow-lg shadow-brand/10">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">New entry</p>
        <h2 className="mt-2 text-3xl font-semibold">Today's reflection feels like...</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-slate-500">Title</label>
            <Input
              placeholder="A gentle headline for how you feel"
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-slate-500">Tags</label>
            <Input
              placeholder="Work, therapy, relationships"
              className="mt-2"
              value="Auto-generated after save"
              disabled
            />
            <p className="mt-1 text-xs text-slate-400">LLM will extract tags, triggers, and emotions automatically.</p>
          </div>
          <div>
            <label className="text-sm text-slate-500">Reflection</label>
            <Textarea
              rows={10}
              placeholder="Let your stream of consciousness flow. MindStorm will find the signal."
              className="mt-2"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Entry saved. Redirecting to your journal...
            </div>
          )}
          {analysisError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {analysisError}
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <Button type="submit" size="lg" disabled={loading || analyzing || status !== "authed"}>
              {loading || analyzing ? "Analyzing & saving..." : "Save journal"}
            </Button>
          </div>
        </form>
      </Card>
      <InsightPanel />
    </div>
  );
};

export default EntryEditorPage;
