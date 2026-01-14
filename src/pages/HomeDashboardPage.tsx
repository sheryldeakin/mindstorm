import { useEffect, useMemo, useState } from "react";
import PatternCardGrid from "../components/features/PatternCardGrid";
import TodayPromptCard from "../components/features/TodayPromptCard";
import WhatHelpedSummary from "../components/features/WhatHelpedSummary";
import { Card } from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import { apiFetch } from "../lib/apiClient";
import type { HomePatternCard, TimeRangeSummary } from "../types/home";
import type { WeeklySummary } from "../types/prepare";
import { useAuth } from "../contexts/AuthContext";

const fallbackPatterns: HomePatternCard[] = [
  {
    id: "pattern-1",
    title: "Afternoon activation",
    description: "Energy spikes after dense meetings, settles with movement.",
    trend: "up",
    confidence: "high",
    sparkline: [38, 42, 51, 57, 62, 66, 58],
  },
  {
    id: "pattern-2",
    title: "Sleep-supported calm",
    description: "Sleep quality is linked to steadier mornings.",
    trend: "steady",
    confidence: "medium",
    sparkline: [55, 52, 54, 56, 55, 57, 56],
  },
  {
    id: "pattern-3",
    title: "Connection boosts focus",
    description: "Brief check-ins help you refocus after stressors.",
    trend: "down",
    confidence: "low",
    sparkline: [64, 61, 59, 55, 52, 49, 47],
  },
];

const fallbackTimeRangeSummary: TimeRangeSummary = {
  weekOverWeekDelta: "Stress down 8% · Sleep variability up 4%",
  missingSignals: ["No entries tagged with appetite", "Skipped two check-ins"],
};

const fallbackHelpedHighlights = [
  "Morning walk",
  "3-minute breath reset",
  "Screen breaks after 4 PM",
  "Therapy prep notes",
];

const fallbackPrompts = [
  "Which moment felt most steady this week?",
  "What would make tomorrow 10% softer?",
];

const rangeOptions = [
  { id: "week", label: "Your week in patterns" },
  { id: "month", label: "Your month in patterns" },
  { id: "year", label: "Your year in patterns" },
  { id: "all", label: "All of your patterns" },
];

const HomeDashboardPage = () => {
  const { status } = useAuth();
  const [range, setRange] = useState("week");
  const [snapshot, setSnapshot] = useState<{
    patterns: HomePatternCard[];
    timeRangeSummary: TimeRangeSummary;
    whatHelped: string[];
    prompts: string[];
    snapshotOverview?: string;
    impactAreas?: string[];
    influences?: string[];
    openQuestions?: string[];
  } | null>(null);
  const [stale, setStale] = useState(true);
  const [loading, setLoading] = useState(false);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const rangeKey =
    range === "week"
      ? "last_7_days"
      : range === "month"
        ? "last_30_days"
        : range === "year"
          ? "last_365_days"
          : "all_time";
  const headingLabel = rangeOptions.find((option) => option.id === range)?.label || "Your week in patterns";

  useEffect(() => {
    if (status !== "authed") {
      setSnapshot(null);
      setStale(true);
      setWeeklySummaries([]);
      return;
    }
    setLoading(true);
    apiFetch<{ snapshot: any; stale?: boolean }>(`/derived/snapshot?rangeKey=${rangeKey}`)
      .then(({ snapshot, stale }) => {
        setSnapshot(snapshot);
        setStale(Boolean(stale));
      })
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false));
  }, [rangeKey, status]);

  useEffect(() => {
    if (status !== "authed") {
      return;
    }
    setWeeklyLoading(true);
    setWeeklyError(null);
    apiFetch<{ weeklySummaries: WeeklySummary[] }>(`/derived/weekly-summaries?rangeKey=${rangeKey}`)
      .then(({ weeklySummaries: responseSummaries }) => {
        setWeeklySummaries(responseSummaries || []);
      })
      .catch((err) => {
        setWeeklyError(err instanceof Error ? err.message : "Failed to load weekly summaries.");
        setWeeklySummaries([]);
      })
      .finally(() => setWeeklyLoading(false));
  }, [rangeKey, status]);

  const patterns = snapshot?.patterns?.length ? snapshot.patterns : fallbackPatterns;
  const timeRangeSummary = snapshot?.timeRangeSummary || null;
  const helpedHighlights = snapshot?.whatHelped?.length ? snapshot.whatHelped : fallbackHelpedHighlights;
  const gentlePrompts = snapshot?.prompts?.length ? snapshot.prompts : fallbackPrompts;
  const currentWeekSummary = useMemo(
    () => (weeklySummaries.length ? weeklySummaries[weeklySummaries.length - 1] : null),
    [weeklySummaries],
  );
  const weeklyHeading =
    range === "week"
      ? "This week so far"
      : range === "month"
        ? "This month so far"
        : range === "year"
          ? "This year so far"
          : "All-time weekly summary";
  const weeklySubcopy =
    range === "week"
      ? "A snapshot of the current week."
      : range === "all"
        ? "Most recent week in your full history."
        : "Most recent week in this range.";
  const snapshotOverview =
    snapshot?.snapshotOverview ||
    (patterns.length
      ? `Lately, your writing often touches on ${patterns
          .slice(0, 3)
          .map((pattern) => pattern.title.toLowerCase())
          .join(", ")}.`
      : "");
  const snapshotImpactAreas = snapshot?.impactAreas || [];
  const snapshotInfluences = snapshot?.influences || [];
  const snapshotQuestions = snapshot?.openQuestions || [];

  return (
    <div className="space-y-8 text-slate-900">
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-lg shadow-brand/10">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Home</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">{headingLabel}</h2>
            <p className="mt-2 text-sm text-slate-500">
              A quick read on how your nervous system shifted over the selected range.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs options={rangeOptions} activeId={range} onValueChange={setRange} />
            {(loading || stale) && (
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Updating</span>
            )}
          </div>
        </div>
      </section>
      <Card className="border-brand/15 bg-white p-6">
        <h3 className="text-xl font-semibold">Your current snapshot</h3>
        <p className="mt-2 text-sm text-slate-600">
          {snapshotOverview || "Current snapshot not available yet."}
        </p>
        <div className="mt-5 grid gap-6 text-sm text-slate-600 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Top patterns</p>
            <div className="mt-3 space-y-2">
              {patterns.slice(0, 5).map((pattern) => (
                <div key={pattern.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{pattern.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Life areas affected</p>
            <div className="mt-3 space-y-2">
              {(snapshotImpactAreas.length ? snapshotImpactAreas : ["Not available yet."])
                .slice(0, 3)
                .map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </div>
                ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Influences</p>
            <div className="mt-3 space-y-2">
              {(snapshotInfluences.length ? snapshotInfluences : ["Not available yet."])
                .slice(0, 3)
                .map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </div>
                ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Questions you might explore</p>
            <div className="mt-3 space-y-2">
              {(snapshotQuestions.length ? snapshotQuestions : ["Not available yet."])
                .slice(0, 3)
                .map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Card>
      <Card className="border-brand/15 bg-white p-6">
        <h3 className="text-xl font-semibold">{weeklyHeading}</h3>
        <p className="mt-1 text-sm text-slate-500">{weeklySubcopy}</p>
        {weeklyLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading weekly summary...</p>
        ) : weeklyError ? (
          <p className="mt-3 text-sm text-rose-600">{weeklyError}</p>
        ) : currentWeekSummary ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Week of {currentWeekSummary.weekStartISO} - {currentWeekSummary.weekEndISO}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {currentWeekSummary.summary?.overTimeSummary || "No summary generated for this week yet."}
            </p>
            <div className="mt-3 text-sm text-slate-600">
              {(currentWeekSummary.summary?.recurringExperiences?.length
                ? currentWeekSummary.summary.recurringExperiences
                : ["No recurring themes captured."])
                .slice(0, 3)
                .map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No weekly summary available yet.</p>
        )}
      </Card>
      <PatternCardGrid patterns={patterns} />
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-xl font-semibold">How it's changing</h3>
          {timeRangeSummary ? (
            <>
              <p className="mt-1 text-sm text-slate-500">{timeRangeSummary.weekOverWeekDelta}</p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Missing signals</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {timeRangeSummary.missingSignals.length ? (
                    timeRangeSummary.missingSignals.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{item}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">No missing signals right now.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No change summary available yet.</p>
          )}
        </Card>
        <div className="space-y-6">
          <WhatHelpedSummary highlights={helpedHighlights} />
          <TodayPromptCard prompts={gentlePrompts} />
        </div>
      </section>
    </div>
  );
};

export default HomeDashboardPage;
