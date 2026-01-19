import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntryCard from "../components/features/EntryCard";
import EmotionChips from "../components/features/EmotionChips";
import InsightCard from "../components/features/InsightCard";
import JournalTimeline from "../components/features/JournalTimeline";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import useEntries from "../hooks/useEntries";
import useInsights from "../hooks/useInsights";
import { quickFilters } from "../lib/mockData";
import PageHeader from "../components/layout/PageHeader";

const JournalDashboard = () => {
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [selectedLimit, setSelectedLimit] = useState<number | null>(null);
  const [autoLimit, setAutoLimit] = useState(5);
  const limit = selectedLimit ?? autoLimit;
  const [entryOffset, setEntryOffset] = useState(0);
  const {
    data: entries,
    loading: entriesLoading,
    error: entriesError,
    empty: entriesEmpty,
  } = useEntries({ limit });
  const {
    data: insights,
    loading: insightsLoading,
    error: insightsError,
    empty: insightsEmpty,
  } = useInsights();

  const {
    data: recentEntries,
    loading: recentLoading,
    error: recentError,
    empty: recentEmpty,
    total: recentTotal,
  } = useEntries({ limit: 7, offset: entryOffset });
  const listKey = `entries-${entryOffset}`;

  const handlePreviousWeek = () => {
    setEntryOffset((prev) => prev + 7);
  };

  const handleNextWeek = () => {
    setEntryOffset((prev) => Math.max(0, prev - 7));
  };
  const reachedEnd = typeof recentTotal === "number" && entryOffset + 7 >= recentTotal;

  useEffect(() => {
    const updateAutoLimit = () => {
      if (!timelineRef.current) return;
      const width = timelineRef.current.getBoundingClientRect().width;
      const cardWidth = 220;
      const gap = 16;
      const count = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)));
      setAutoLimit(count);
    };

    updateAutoLimit();
    window.addEventListener("resize", updateAutoLimit);
    return () => window.removeEventListener("resize", updateAutoLimit);
  }, []);

  const limitOptions = useMemo(() => [3, 5, 7], []);

  return (
    <div className="space-y-10">
      <PageHeader
        pageId="journal"
        actions={(
          <>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Show</span>
              {limitOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedLimit(value)}
                  className={
                    (value === limit ? "bg-brand text-white" : "text-slate-600 hover:text-brand") +
                    " rounded-full px-2.5 py-1 text-xs font-semibold transition"
                  }
                  aria-pressed={value === limit}
                >
                  {value}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => navigate("/patient/entry")}>
              New entry
            </Button>
          </>
        )}
      >
        <div ref={timelineRef}>
          <JournalTimeline entries={entries} loading={entriesLoading} />
          <div className="mt-6">
            {entriesLoading ? (
              <div className="h-10 rounded-full bg-brand/10" />
            ) : entries[0]?.emotions?.length ? (
              <EmotionChips emotions={entries[0].emotions} active={entries[0].emotions[0]?.label ?? ""} />
            ) : (
              <p className="text-sm text-slate-500">Add an entry to see emotion chips here.</p>
            )}
          </div>
        </div>
      </PageHeader>
      <section className="rounded-3xl border border-brand/15 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-slate-900">Quick filters</h3>
          <Button variant="ghost" size="sm">
            Reset
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickFilters.map((filter, index) => (
            <Button key={filter} variant={index === 0 ? "primary" : "secondary"} size="sm">
              {filter}
            </Button>
          ))}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brandLight">Journal library</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Latest entries</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handlePreviousWeek} disabled={reachedEnd}>
                Older
              </Button>
              <Button variant="secondary" size="sm" onClick={handleNextWeek} disabled={entryOffset === 0}>
                Newer
              </Button>
            </div>
          </div>
          {recentLoading ? (
            <>
              {[1, 2].map((item) => (
                <Card key={item} className="animate-pulse p-6 text-slate-900">
                  <div className="flex items-center justify-between text-sm text-brand/60">
                    <span className="h-3 w-24 rounded-full bg-brand/10" />
                    <span className="h-3 w-16 rounded-full bg-brand/10" />
                  </div>
                  <div className="mt-4 h-6 w-2/3 rounded-full bg-brand/10" />
                  <div className="mt-2 h-4 w-full rounded-full bg-brand/10" />
                  <div className="mt-4 h-8 w-full rounded-2xl bg-brand/10" />
                </Card>
              ))}
            </>
          ) : recentEmpty ? (
            <Card className="p-6 text-slate-700">
              <h3 className="text-lg font-semibold text-slate-800">No entries yet</h3>
              <p className="mt-1 text-sm text-slate-600">Log your first reflection to see it here.</p>
              <Button className="mt-4" onClick={() => navigate("/patient/entry")}>New entry</Button>
            </Card>
          ) : recentError ? (
            <Card className="p-6 text-slate-700">
              <h3 className="text-lg font-semibold text-slate-800">Entries not available</h3>
              <p className="mt-1 text-sm text-slate-600">
                We&apos;ll show your reflections here once your workspace is ready.
              </p>
            </Card>
          ) : (
            <div key={listKey} className="space-y-6 list-fade">
              {recentEntries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4 lg:col-span-2">
          {insightsLoading ? (
            <Card className="animate-pulse p-5">
              <div className="h-5 w-32 rounded-full bg-brand/10" />
              <div className="mt-2 h-4 w-full rounded-full bg-brand/10" />
              <div className="mt-2 h-4 w-3/4 rounded-full bg-brand/10" />
            </Card>
          ) : insightsError ? (
            <Card className="p-5 text-slate-700">
              <p className="font-semibold">Insights not available</p>
              <p className="text-sm text-slate-600">We&apos;ll surface correlations after entries are present.</p>
            </Card>
          ) : insightsEmpty ? (
            <Card className="p-5 text-slate-700">
              <p className="font-semibold">No insights yet</p>
              <p className="text-sm text-slate-600">
                We&apos;ll surface correlations after you log a few entries.
              </p>
            </Card>
          ) : (
            insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
          <Card className="bg-gradient-to-br from-sky-50 to-indigo-50 p-5 text-slate-900">
            <h3 className="text-xl font-semibold">Session-ready brief</h3>
            <p className="mt-2 text-sm text-slate-600">
              {entries.length ? `${entries.length} entries tagged for therapy.` : "Add entries to build your brief."}
            </p>
            <Button className="mt-4 w-full">Export summary</Button>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default JournalDashboard;
