/**
 * Props for InsightToggles (Patient-Facing).
 * Use non-clinical, reflective language in UI copy.
 */
interface InsightTogglesProps {
  insightsEnabled: boolean;
  onToggleInsights: (value: boolean) => void;
  hiddenTopics: string[];
  onToggleTopic: (topic: string) => void;
  topics: string[];
}

const InsightToggles = ({
  insightsEnabled,
  onToggleInsights,
  hiddenTopics,
  onToggleTopic,
  topics,
}: InsightTogglesProps) => (
  <div className="ms-glass-surface rounded-2xl border p-4">
    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
      <span>Insights</span>
      <input
        type="checkbox"
        checked={insightsEnabled}
        onChange={(event) => onToggleInsights(event.target.checked)}
        className="h-4 w-4 accent-brand"
      />
    </div>
    <p className="mt-2 text-xs text-slate-500">
      Turn off insights if you prefer to journal without automated reflections.
    </p>
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Hide topics</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {topics.map((topic) => {
          const isHidden = hiddenTopics.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => onToggleTopic(topic)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isHidden
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand/30"
              }`}
            >
              {isHidden ? "Hidden" : "Visible"} · {topic}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default InsightToggles;
