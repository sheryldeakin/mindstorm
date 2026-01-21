import type { JournalEntry } from "../../types/journal";
import {
  buildLanguageReflection,
  buildOverallEmotions,
  buildPatternHints,
  buildQuestions,
  buildThemes,
  buildTimeReflection,
  buildTouchesOn,
  buildWhatHelped,
} from "../../lib/entryInsights";
import Badge from "../ui/Badge";

/** Patient-Facing: summarizes signals from a single journal entry in reflective language. */
interface EntrySummaryPanelProps {
  entry: JournalEntry;
}

const EntrySummaryPanel = ({ entry }: EntrySummaryPanelProps) => {
  const analysis = {
    emotions: entry.emotions || [],
    triggers: entry.triggers || [],
    themes: entry.themes || [],
  };
  const themes = buildThemes(analysis);
  const touchesOn = buildTouchesOn(analysis);
  const overallEmotions = buildOverallEmotions(analysis);
  const languageReflection = buildLanguageReflection(entry.summary || "");
  const timeReflection = buildTimeReflection(entry.summary || "");
  const questions = buildQuestions(themes);
  const patternHints = buildPatternHints(themes);
  const whatHelped = buildWhatHelped(entry.summary || "");

  return (
    <aside className="ms-card ms-elev-2 space-y-6 p-6 text-slate-900">
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand/60">Entry summary</p>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Overall emotions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {overallEmotions.length ? (
            overallEmotions.map((emotion) => (
              <Badge key={emotion.label} tone={emotion.tone}>
                {emotion.label} · {emotion.intensity}%
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500">No emotion signals yet.</p>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">What this entry touches on</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {touchesOn.length ? (
            touchesOn.slice(0, 6).map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {item}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">Add tags or themes to surface topics.</p>
          )}
        </div>
      </div>
      <div className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Language reflections</p>
        <p className="mt-2">
          {languageReflection || "No standout language detected yet in this entry."}
        </p>
        <p className="mt-3 font-semibold text-slate-700">Time reflections</p>
        <p className="mt-2">
          {timeReflection || "No timing references detected yet in this entry."}
        </p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Things you might see in Patterns</h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-600">
          {patternHints.map((hint) => (
            <li key={hint} className="ms-glass-surface rounded-2xl border px-3 py-2">
              {hint}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">What helped</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {whatHelped.length ? (
            whatHelped.map((item) => (
              <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                {item}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No supports mentioned in this entry.</p>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Questions you might sit with</h3>
        <ul className="mt-2 space-y-2 text-sm text-slate-600">
          {questions.map((question) => (
            <li key={question} className="ms-glass-surface rounded-2xl border px-3 py-2">
              {question}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default EntrySummaryPanel;
