import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LiveInsightPanel from "../components/features/LiveInsightPanel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Textarea from "../components/ui/Textarea";
import useEntry from "../hooks/useEntry";
import useUpdateEntry from "../hooks/useUpdateEntry";
import { analyzeEntryText, type LlmAnalysis } from "../lib/analyzeEntry";

const formatDateInput = (value: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const EntryEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useEntry(id);
  const { updateEntry, loading: saving, error: saveError } = useUpdateEntry();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [draftAnalysis, setDraftAnalysis] = useState<LlmAnalysis | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const draftRequestRef = useRef(0);
  const entryIdRef = useRef<string | null>(null);

  const draftText = [title, summary].filter(Boolean).join(". ").trim();
  const formattedEntryDate = entryDate
    ? new Date(`${entryDate}T00:00:00`).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  useEffect(() => {
    if (!data) return;
    if (entryIdRef.current === data.id) return;

    setTitle(data.title || "");
    setSummary(data.summary || "");
    const baseDate = data.dateISO || data.createdAt || new Date().toISOString();
    setEntryDate(formatDateInput(baseDate));
    entryIdRef.current = data.id;
  }, [data]);

  useEffect(() => {
    if (!draftText) {
      setDraftAnalysis(null);
      setDraftError(null);
      setDraftLoading(false);
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

  const handleSave = async () => {
    if (!id) return;
    setActionMessage(null);
    try {
      await updateEntry(id, {
        title,
        summary,
        dateISO: entryDate,
        themeIntensities: draftAnalysis?.themeIntensities || [],
      });
      setActionMessage("Entry updated.");
      navigate(`/patient/entry/${id}`);
    } catch {
      // error handled in hook
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
        Loading entry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error || "Entry not found."}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Card className="lg:col-span-2 border p-8 text-slate-900">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Edit entry</p>
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
        <div className="mt-5 space-y-6">
          <div>
            <label className="text-sm text-slate-500">Title</label>
            <Input className="mt-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-500">Reflection</label>
            <Textarea
              rows={10}
              className="mt-2"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          {saveError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {saveError}
            </div>
          )}
          {actionMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {actionMessage}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => navigate(`/patient/entry/${id}`)}
            >
              Cancel
            </Button>
          </div>
        </div>
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

export default EntryEditPage;
