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

const JournalDashboard = () => {
  const navigate = useNavigate();
  const {
    data: entries,
    loading: entriesLoading,
    error: entriesError,
    empty: entriesEmpty,
  } = useEntries();
  const {
    data: insights,
    loading: insightsLoading,
    error: insightsError,
    empty: insightsEmpty,
  } = useInsights();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-lg shadow-brand/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">This week's reflections</h2>
          </div>
          <Button variant="secondary" onClick={() => navigate("/entry")}>
            New entry
          </Button>
        </div>
        <div className="mt-6">
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
      </section>
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-sm">
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
          {entriesLoading ? (
            <>
              {[1, 2].map((item) => (
                <Card key={item} className="animate-pulse border-slate-100 p-6 text-slate-900 shadow-sm">
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
          ) : entriesEmpty ? (
            <Card className="border-dashed border-slate-200 bg-slate-50/70 p-6 text-slate-700">
              <h3 className="text-lg font-semibold text-slate-800">No entries yet</h3>
              <p className="mt-1 text-sm text-slate-600">Log your first reflection to see it here.</p>
              <Button className="mt-4">New entry</Button>
            </Card>
          ) : entriesError ? (
            <Card className="border-dashed border-slate-200 bg-slate-50/70 p-6 text-slate-700">
              <h3 className="text-lg font-semibold text-slate-800">Entries not available</h3>
              <p className="mt-1 text-sm text-slate-600">
                We&apos;ll show your reflections here once your workspace is ready.
              </p>
            </Card>
          ) : (
            entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
          )}
        </div>
        <div className="space-y-4 lg:col-span-2">
          {insightsLoading ? (
            <Card className="animate-pulse border-slate-100 p-5 shadow-sm">
              <div className="h-5 w-32 rounded-full bg-brand/10" />
              <div className="mt-2 h-4 w-full rounded-full bg-brand/10" />
              <div className="mt-2 h-4 w-3/4 rounded-full bg-brand/10" />
            </Card>
          ) : insightsError ? (
            <Card className="border-dashed border-slate-200 bg-slate-50/70 p-5 text-slate-700">
              <p className="font-semibold">Insights not available</p>
              <p className="text-sm text-slate-600">We&apos;ll surface correlations after entries are present.</p>
            </Card>
          ) : insightsEmpty ? (
            <Card className="border-dashed border-slate-200 bg-slate-50/70 p-5 text-slate-700">
              <p className="font-semibold">No insights yet</p>
              <p className="text-sm text-slate-600">
                We&apos;ll surface correlations after you log a few entries.
              </p>
            </Card>
          ) : (
            insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
          <Card className="border-slate-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 text-slate-900 shadow-sm">
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
