import { useEffect, useMemo, useState } from "react";
import type { LlmAnalysis } from "../../lib/analyzeEntry";
import {
  buildLanguageReflection,
  buildOverallEmotions,
  buildQuestions,
  buildThemes,
  buildTimeReflection,
  buildTouchesOn,
} from "../../lib/entryInsights";
import Badge from "../ui/Badge";

interface LiveInsightPanelProps {
  analysis?: LlmAnalysis | null;
  loading?: boolean;
  error?: string | null;
  draftText: string;
}

const useTypewriter = (text: string, isActive: boolean, speed = 18) => {
  const [output, setOutput] = useState("");

  useEffect(() => {
    if (!isActive) {
      setOutput("");
      return;
    }

    let index = 0;
    setOutput("");
    const timer = window.setInterval(() => {
      index += 1;
      setOutput(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [isActive, speed, text]);

  return output;
};

const LiveInsightPanel = ({ analysis, loading, error, draftText }: LiveInsightPanelProps) => {
  const overallEmotions = buildOverallEmotions(analysis);
  const themes = buildThemes(analysis);
  const touchesOn = buildTouchesOn(analysis);
  const languageReflection = buildLanguageReflection(draftText);
  const timeReflection = buildTimeReflection(draftText);
  const questions = buildQuestions(themes);
  const hasDraft = Boolean(draftText.trim());
  const analysisKey = useMemo(() => JSON.stringify(analysis || {}), [analysis]);
  const [revealStep, setRevealStep] = useState(0);

  useEffect(() => {
    if (!hasDraft || loading) {
      setRevealStep(0);
      return;
    }

    let current = 0;
    setRevealStep(0);
    const timer = window.setInterval(() => {
      current += 1;
      setRevealStep(current);
      if (current >= 6) {
        window.clearInterval(timer);
      }
    }, 220);

    return () => window.clearInterval(timer);
  }, [analysisKey, hasDraft, loading]);

  const typedLanguage = useTypewriter(languageReflection || "We're extracting language cues.", revealStep >= 4);
  const typedTime = useTypewriter(timeReflection || "We're extracting timing cues.", revealStep >= 5);
  const typedQuestionOne = useTypewriter(questions[0] || "Does anything make this feel lighter?", revealStep >= 6);
  const typedQuestionTwo = useTypewriter(questions[1] || "Is this something you've felt before?", revealStep >= 6, 16);

  return (
    <aside className="ms-card ms-elev-2 p-6 text-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand/60">Live insight</p>
      {loading && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 loading-bar" aria-hidden />
      )}
      {(loading || error) && (
        <div className="ms-glass-surface mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs text-slate-500">
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
      {!hasDraft && !loading ? (
        <p className="mt-4 text-sm text-slate-500">Start typing to surface live reflections.</p>
      ) : (
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Overall emotions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {loading || revealStep < 1 ? (
                <div className="typing-line-no-caret text-sm text-slate-500">Generating emotion signals...</div>
              ) : overallEmotions.length ? (
                overallEmotions.map((emotion) => (
                  <Badge key={emotion.label} tone={emotion.tone}>
                    {emotion.label} · {emotion.intensity}%
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">Add more detail to surface emotions.</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Themes</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {loading || revealStep < 2 ? (
                <div className="typing-line-no-caret text-sm text-slate-500">Detecting themes...</div>
              ) : themes.length ? (
                themes.map((theme) => (
                  <span key={theme} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    {theme}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">Themes will appear as you write.</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">This entry touches on</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {loading || revealStep < 3 ? (
                <li className="typing-line-no-caret text-sm text-slate-500">Mapping related topics...</li>
              ) : touchesOn.length ? (
                touchesOn.slice(0, 4).map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-500">Keep writing to reveal what this touches on.</li>
              )}
            </ul>
          </div>
          <div className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Language reflections</p>
            <p className="mt-2">
              {loading || revealStep < 4
                ? "Listening for emotionally loaded words..."
                : typedLanguage || "We'll highlight strong language once it appears in your draft."}
            </p>
            <p className="mt-3 font-semibold text-slate-700">Time reflections</p>
            <p className="mt-2">
              {loading || revealStep < 5
                ? "Listening for timing cues..."
                : typedTime || "Mention timing (weeks, months, days) to surface a time reflection."}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Questions to expand on in journal entry</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {loading || revealStep < 6 ? (
                <li className="typing-line-no-caret text-sm text-slate-500">Generating reflective prompts...</li>
              ) : (
                <>
                  <li className="ms-glass-surface rounded-2xl border px-3 py-2">
                    {typedQuestionOne}
                  </li>
                  <li className="ms-glass-surface rounded-2xl border px-3 py-2">
                    {typedQuestionTwo}
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
};

export default LiveInsightPanel;
