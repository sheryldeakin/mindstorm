import type { JournalEntry } from "../../types/journal";

interface ThemeIntensitySummaryProps {
  themes: JournalEntry["themeIntensities"];
}

const ThemeIntensitySummary = ({ themes }: ThemeIntensitySummaryProps) => {
  if (!themes?.length) {
    return <p className="text-sm text-slate-500">No theme intensity signals available yet.</p>;
  }

  const sorted = [...themes].sort((a, b) => b.intensity - a.intensity);

  return (
    <div className="space-y-3">
      {sorted.map((item) => (
        <div key={item.theme} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="font-semibold text-slate-700">{item.theme}</span>
            <span>{Math.round(item.intensity * 100)}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-sky-400"
              style={{ width: `${Math.round(item.intensity * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThemeIntensitySummary;
