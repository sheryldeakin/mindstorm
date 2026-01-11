import type { JournalEntry } from "../../types/journal";

interface JournalTimelineProps {
  entries: JournalEntry[];
  loading?: boolean;
}

const JournalTimeline = ({ entries, loading = false }: JournalTimelineProps) => {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="min-w-[200px] animate-pulse rounded-3xl border border-brand/10 bg-white p-4 text-sm text-brand/70 shadow-sm"
          >
            <div className="h-3 w-24 rounded-full bg-brand/10" />
            <div className="mt-3 h-4 w-32 rounded-full bg-brand/10" />
            <div className="mt-2 h-3 w-20 rounded-full bg-brand/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-dashed border-brand/15 bg-slate-50/70 p-4 text-sm text-slate-600">
        No entries yet. Log your first reflection to see your timeline here.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="min-w-[200px] rounded-3xl border border-brand/15 bg-white p-4 text-sm text-brand/70 shadow-sm"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-brand/50">{entry.date}</p>
          <p className="mt-3 font-semibold text-brand">{entry.title}</p>
          <p className="mt-2 text-slate-500">{entry.emotions[0]?.label ?? "—"}</p>
        </div>
      ))}
    </div>
  );
};

export default JournalTimeline;
