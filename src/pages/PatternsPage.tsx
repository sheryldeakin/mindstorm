import { useMemo, useState } from "react";
import InsightCard from "../components/features/InsightCard";
import PatternHighlights from "../components/features/PatternHighlights";
import Tabs from "../components/ui/Tabs";
import { Card } from "../components/ui/Card";
import useEntries from "../hooks/useEntries";
import useInsights from "../hooks/useInsights";
import type { PatternMetric } from "../types/journal";

const tabOptions = [
  { id: "week", label: "This week" },
  { id: "month", label: "30 days" },
  { id: "quarter", label: "90 days" },
];

const PatternsPage = () => {
  const [range, setRange] = useState("week");
  const { data: entries, loading: entriesLoading } = useEntries({ limit: 200 });
  const { data: insights, loading: insightsLoading, error: insightsError, empty: insightsEmpty } = useInsights({
    limit: 6,
  });

  const rangeDays = range === "week" ? 7 : range === "month" ? 30 : 90;

  const entriesInRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (rangeDays - 1));
    return entries.filter((entry) => {
      if (!entry.dateISO) return false;
      const [year, month, day] = entry.dateISO.split("-").map((value) => Number(value));
      if (!year || !month || !day) return false;
      const entryDate = new Date(year, month - 1, day);
      return entryDate >= start && entryDate <= today;
    });
  }, [entries, rangeDays]);

  const emotionFrequency = useMemo(() => {
    const counts = new Map<string, number>();
    entriesInRange.forEach((entry) => {
      entry.emotions?.forEach((emotion) => {
        if (!emotion.label) return;
        counts.set(emotion.label, (counts.get(emotion.label) || 0) + 1);
      });
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({
        label,
        value: total ? Math.round((count / total) * 100) : 0,
      }));
  }, [entriesInRange]);

  const triggerBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    entriesInRange.forEach((entry) => {
      entry.triggers?.forEach((trigger) => {
        if (!trigger) return;
        counts.set(trigger, (counts.get(trigger) || 0) + 1);
      });
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({
        label,
        percent: total ? Math.round((count / total) * 100) : 0,
      }));
  }, [entriesInRange]);

  const patternMetrics = useMemo<PatternMetric[]>(() => {
    const entryCount = entriesInRange.length;
    const emotions = entriesInRange.flatMap((entry) => entry.emotions || []);
    const avgIntensity = emotions.length
      ? Math.round(emotions.reduce((sum, emotion) => sum + (emotion.intensity || 0), 0) / emotions.length)
      : 0;
    const triggers = entriesInRange.flatMap((entry) => entry.triggers || []);
    const triggerCounts = triggers.reduce((acc, trigger) => {
      acc[trigger] = (acc[trigger] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return [
      {
        id: "metric-entries",
        label: "Entries logged",
        value: entryCount ? `${entryCount} total` : "No entries",
        delta: range === "week" ? "Last 7 days" : range === "month" ? "Last 30 days" : "Last 90 days",
        status: "up",
      },
      {
        id: "metric-emotion",
        label: "Avg emotion intensity",
        value: avgIntensity ? `${avgIntensity}%` : "—",
        delta: avgIntensity ? "Across tagged emotions" : "Add more reflections",
        status: avgIntensity > 50 ? "up" : "down",
      },
      {
        id: "metric-trigger",
        label: "Top trigger",
        value: topTrigger || "—",
        delta: topTrigger ? "Most frequent" : "Waiting on triggers",
        status: "steady",
      },
    ];
  }, [entriesInRange, range]);

  return (
    <div className="space-y-10 text-slate-900">
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-lg shadow-brand/10">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Patterns & insights</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-semibold">Your nervous system trends</h2>
          <Tabs options={tabOptions} activeId={range} onValueChange={setRange} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Soft gradients call out when emotions spike, soften, or correlate with habits over the last {range}.
        </p>
        <div className="mt-8">
          <PatternHighlights metrics={patternMetrics} />
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-xl font-semibold">Emotion frequency</h3>
          <div className="mt-6 space-y-4">
            {entriesLoading ? (
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ) : emotionFrequency.length ? (
              emotionFrequency.map((emotion) => (
                <div key={emotion.label}>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{emotion.label}</span>
                    <span>{emotion.value}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                      style={{ width: `${emotion.value}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Add entries with emotions to see frequency trends.</p>
            )}
          </div>
        </Card>
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-xl font-semibold">Trigger categories</h3>
          <div className="mt-6 space-y-4">
            {entriesLoading ? (
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ) : triggerBreakdown.length ? (
              triggerBreakdown.map((trigger) => (
                <div key={trigger.label} className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{trigger.label}</p>
                  <p className="text-sm text-slate-900">{trigger.percent}%</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Track triggers to see what is showing up most.</p>
            )}
          </div>
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {insightsLoading ? (
          <Card className="h-40 animate-pulse border-brand/10 bg-white" />
        ) : insightsError ? (
          <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {insightsError}
          </Card>
        ) : insightsEmpty ? (
          <Card className="border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Add more entries to surface insights here.
          </Card>
        ) : (
          insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
        )}
      </section>
    </div>
  );
};

export default PatternsPage;
