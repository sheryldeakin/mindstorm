import { emotionSuggestions, triggerSuggestions } from "../../lib/mockData";
import Badge from "../ui/Badge";

const InsightPanel = () => (
  <aside className="rounded-3xl border border-slate-100 bg-white p-6 text-slate-900 shadow-lg shadow-slate-100">
    <p className="text-sm font-semibold uppercase tracking-[0.4em] text-brand/60">Live insight</p>
    <h3 className="mt-4 text-xl font-semibold text-brand">Suggested emotions</h3>
    <div className="mt-4 flex flex-wrap gap-2">
      {emotionSuggestions.map((emotion) => (
        <Badge key={emotion.label} tone={emotion.tone}>
          {emotion.label} - {emotion.intensity}%
        </Badge>
      ))}
    </div>
    <h3 className="mt-6 text-xl font-semibold text-brand">Potential triggers</h3>
    <ul className="mt-4 space-y-3 text-sm text-slate-600">
      {triggerSuggestions.map((trigger) => (
        <li key={trigger.label} className="flex items-center justify-between">
          <span>{trigger.label}</span>
          <span className="text-slate-400">{trigger.frequency}x</span>
        </li>
      ))}
    </ul>
    <div className="mt-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">Themes detected</p>
      <p>Work intensity, evening rumination, resilience rituals.</p>
    </div>
  </aside>
);

export default InsightPanel;
