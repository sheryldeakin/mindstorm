import { useEffect, useMemo, useRef, useState } from "react";
import type { LlmAnalysis } from "../../lib/analyzeEntry";
import { emotionSuggestions, triggerSuggestions } from "../../lib/mockData";
import Badge from "../ui/Badge";

interface InsightPanelProps {
  analysis?: LlmAnalysis | null;
  loading?: boolean;
  error?: string | null;
  hasDraft?: boolean;
}

const InsightPanel = ({ analysis, loading, error, hasDraft = false }: InsightPanelProps) => {
  const shouldShowPlaceholder = !hasDraft && !loading && !analysis;
  const emotions = analysis?.emotions?.length
    ? analysis.emotions
    : shouldShowPlaceholder
      ? []
      : emotionSuggestions;
  const triggers = analysis?.triggers?.length
    ? analysis.triggers.map((trigger) => ({ label: trigger, frequency: 1 }))
    : shouldShowPlaceholder
      ? []
      : triggerSuggestions;
  const themes = analysis?.themes?.length
    ? analysis.themes
    : shouldShowPlaceholder
      ? []
      : ["work intensity", "evening rumination", "resilience rituals"];
  const tagSet = new Set<string>();
  analysis?.emotions?.forEach((emotion) => {
    if (emotion.label) tagSet.add(emotion.label.toLowerCase());
  });
  analysis?.triggers?.forEach((trigger) => tagSet.add(trigger));
  themes.forEach((theme) => tagSet.add(theme));
  const tags = Array.from(tagSet);
  const tagsText = useMemo(() => `${themes.join(", ")}.`, [themes]);
  const hasAnalysisTags = Boolean(analysis?.themes?.length);
  const [typedTags, setTypedTags] = useState(tagsText);
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasAnalysisTags) {
      setTypedTags(tagsText);
      setIsTyping(false);
      return;
    }

    if (typingRef.current) {
      window.clearInterval(typingRef.current);
    }

    setTypedTags("");
    setIsTyping(true);
    let index = 0;

    const step = () => {
      index += 1;
      setTypedTags(tagsText.slice(0, index));
      if (index >= tagsText.length) {
        setIsTyping(false);
        if (typingRef.current) {
          window.clearInterval(typingRef.current);
          typingRef.current = null;
        }
      }
    };

    step();
    typingRef.current = window.setInterval(step, 22);

    return () => {
      if (typingRef.current) {
        window.clearInterval(typingRef.current);
        typingRef.current = null;
      }
    };
  }, [hasAnalysisTags, tagsText]);

  const showSkeleton = loading && !analysis;

  return (
    <aside className="rounded-3xl border border-slate-100 bg-white p-6 text-slate-900 shadow-lg shadow-slate-100">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand/60">Live insight</p>
      {loading && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 loading-bar" aria-hidden />
      )}
      {(loading || error) && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            {loading ? (
              <>
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand/60" />
                <span>Analyzing your draft for signals...</span>
              </>
            ) : (
              <span>Insights paused while we retry.</span>
            )}
          </div>
          {loading && <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Live</span>}
        </div>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      <h3 className="mt-4 text-xl font-semibold text-brand">Suggested emotions</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {showSkeleton
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`emotion-skeleton-${index}`}
                className="h-7 w-28 animate-pulse rounded-full bg-slate-100"
              />
            ))
          : emotions.length
            ? emotions.map((emotion) => (
                <Badge key={emotion.label} tone={emotion.tone}>
                  {emotion.label} - {emotion.intensity}%
                </Badge>
              ))
            : (
                <p className="text-sm text-slate-500">Start writing to see emotion signals.</p>
              )}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-brand">Potential triggers</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {showSkeleton
          ? Array.from({ length: 3 }).map((_, index) => (
              <li key={`trigger-skeleton-${index}`} className="flex items-center justify-between">
                <span className="h-4 w-40 animate-pulse rounded-full bg-slate-100" />
                <span className="h-4 w-8 animate-pulse rounded-full bg-slate-100" />
              </li>
            ))
          : triggers.length
            ? triggers.map((trigger) => (
                <li key={trigger.label} className="flex items-center justify-between">
                  <span>{trigger.label}</span>
                  <span className="text-slate-400">{trigger.frequency}x</span>
                </li>
              ))
            : (
                <li className="text-sm text-slate-500">Add detail to surface likely triggers.</li>
              )}
      </ul>
      <div className="mt-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Themes detected</p>
        {showSkeleton ? (
          <div className="mt-2 space-y-2">
            <p className="typing-line text-sm text-slate-500">Extracting themes from your draft…</p>
          </div>
        ) : hasAnalysisTags ? (
          <p className={isTyping ? "typing-caret" : undefined}>{typedTags}</p>
        ) : (
          <p>{tagsText}</p>
        )}
      </div>
      <h3 className="mt-6 text-xl font-semibold text-brand">Draft tags</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`tag-skeleton-${index}`}
              className="h-7 w-24 animate-pulse rounded-full bg-slate-100"
            />
          ))
        ) : tags.length ? (
          tags.map((tag) => (
            <Badge key={tag} className="bg-slate-100 text-slate-700">
              {tag}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-slate-500">Tags will appear as you add more detail.</p>
        )}
      </div>
    </aside>
  );
};

export default InsightPanel;
