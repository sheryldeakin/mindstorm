import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LiveInsightPanel from "../components/features/LiveInsightPanel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Textarea from "../components/ui/Textarea";
import { useAuth } from "../contexts/AuthContext";
import useCreateEntry from "../hooks/useCreateEntry";
import { analyzeEntryText, type LlmAnalysis } from "../lib/analyzeEntry";

const EntryEditorPage = () => {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const { createEntry, loading, error, success, setSuccess } = useCreateEntry();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [entryDate, setEntryDate] = useState(() => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    return localIso;
  });
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [draftAnalysis, setDraftAnalysis] = useState<LlmAnalysis | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const draftRequestRef = useRef(0);
  const lastAnalyzedTextRef = useRef("");
  const draftText = [title, summary].filter(Boolean).join(". ").trim();
  const suggestedTitle = draftAnalysis?.title?.trim() || "";
  const formattedEntryDate = new Date(`${entryDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (success) {
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [setSuccess, success]);

  useEffect(() => {
    if (!draftText) {
      setDraftAnalysis(null);
      setDraftError(null);
      setDraftLoading(false);
      lastAnalyzedTextRef.current = "";
      return;
    }

    const requestId = ++draftRequestRef.current;
    setDraftLoading(true);
    setDraftError(null);

    const timeout = window.setTimeout(() => {
      analyzeEntryText(draftText)
        .then((analysis) => {
          if (draftRequestRef.current !== requestId) return;
          setDraftAnalysis(analysis);
          lastAnalyzedTextRef.current = draftText;
        })
        .catch((err) => {
          if (draftRequestRef.current !== requestId) return;
          const message = err instanceof Error ? err.message : "Could not analyze draft.";
          setDraftError(message);
        })
        .finally(() => {
          if (draftRequestRef.current === requestId) {
            setDraftLoading(false);
          }
        });
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [draftText]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const combinedText = draftText;
    if (!combinedText) {
      setAnalysisError("Add some reflection text first.");
      return;
    }
    setAnalysisError(null);
    setAnalyzing(true);
    try {
      const analysis =
        draftAnalysis && lastAnalyzedTextRef.current === combinedText
          ? draftAnalysis
          : await analyzeEntryText(combinedText);
      const combinedTags = new Set<string>();
      analysis.emotions?.forEach((emotion) => {
        if (emotion.label) combinedTags.add(emotion.label.toLowerCase());
      });
      analysis.triggers?.forEach((trigger) => combinedTags.add(trigger));
      analysis.themes?.forEach((theme) => combinedTags.add(theme));
      const emotions = analysis.emotions || [];

      const entry = await createEntry({
        title: title || suggestedTitle || "Untitled reflection",
        summary,
        tags: Array.from(combinedTags),
        emotions,
        date: entryDate,
        triggers: analysis.triggers || [],
        themes: analysis.themes || [],
        themeIntensities: analysis.themeIntensities || [],
      });
      if (entry?.id) {
        navigate(`/patient/entry/${entry.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not analyze entry.";
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Card className="lg:col-span-2 flex min-h-[720px] flex-col border p-8 text-slate-900">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">New entry</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditingDate(true)}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-2xl font-semibold text-slate-900 transition hover:border-slate-300"
            aria-label="Edit entry date"
          >
            {formattedEntryDate}
          </button>
          {isEditingDate && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="max-w-[200px]"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                onBlur={() => setIsEditingDate(false)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsEditingDate(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
        <form className="mt-5 flex flex-1 flex-col gap-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-slate-500">Title</label>
            <Input
              placeholder={suggestedTitle || "A gentle headline for how you feel"}
              className="mt-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {suggestedTitle && !title && (
              <p className="mt-1 text-xs text-slate-400">
                Suggested title will be used if you leave this blank.
              </p>
            )}
          </div>
          <div className="flex flex-1 flex-col">
            <label className="text-sm text-slate-500">Reflection</label>
            <Textarea
              rows={12}
              placeholder="Let your stream of consciousness flow. MindStorm will find the signal."
              className="mt-2 flex-1 text-sm"
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
              Entry saved. Opening your summary...
            </div>
          )}
          {analysisError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {analysisError}
            </div>
          )}
          <div className="mt-auto flex flex-wrap gap-4">
            <Button type="submit" size="lg" disabled={loading || analyzing || status !== "authed"}>
              {loading || analyzing ? "Analyzing & saving..." : "Save journal"}
            </Button>
          </div>
        </form>
      </Card>
      <LiveInsightPanel
        analysis={draftAnalysis}
        loading={draftLoading}
        error={draftError}
        draftText={draftText}
      />
    </div>
  );
};

export default EntryEditorPage;
