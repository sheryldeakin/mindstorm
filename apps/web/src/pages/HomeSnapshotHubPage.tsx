import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Brain, Briefcase, Heart } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import Tabs from "../components/ui/Tabs";
import { Card } from "../components/ui/Card";
import HomeAvatarScene, { type HomeAvatarDomain, type SceneEmotion } from "../components/avatar/HomeAvatarScene";
import PatternCardGrid from "../components/features/PatternCardGrid";
import RecentEmotionsPulse from "../components/features/RecentEmotionsPulse";
import PatternHighlights from "../components/features/PatternHighlights";
import InfluencesPanel from "../components/features/InfluencesPanel";
import LifeAreasImpactPanel from "../components/features/LifeAreasImpactPanel";
import WhatHelpedSummary from "../components/features/WhatHelpedSummary";
import TodayPromptCard from "../components/features/TodayPromptCard";
import { apiFetch } from "../lib/apiClient";
import useEntries from "../hooks/useEntries";
import { useAuth } from "../contexts/AuthContext";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import type { HomePatternCard, TimeRangeSummary } from "../types/home";
import type { PatternMetric } from "../types/journal";
import type { LifeAreaImpact, PatternInfluence } from "../types/patterns";

const rangeOptions = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const buildSnapshotSynthesis = (patterns: HomePatternCard[], influences: string[]) => {
  const phrases = new Set<string>();

  patterns.forEach((pattern) => {
    const title = pattern.title.toLowerCase();
    if (title.includes("self") || title.includes("compassion")) {
      phrases.add("care toward yourself");
    }
    if (title.includes("connection") || title.includes("social") || title.includes("relationships")) {
      phrases.add("connection with others");
    }
    if (title.includes("motivation") || title.includes("energy") || title.includes("activation")) {
      phrases.add("motivation and energy");
    }
    if (title.includes("sleep") || title.includes("rest")) {
      phrases.add("rest and recovery");
    }
    if (title.includes("stress") || title.includes("overwhelm")) {
      phrases.add("stress and pressure");
    }
    if (title.includes("focus") || title.includes("attention")) {
      phrases.add("focus and presence");
    }
  });

  const patternPhrases = Array.from(phrases).slice(0, 3);
  const baseline =
    patternPhrases.length > 0
      ? `Lately, your writing reflects ${patternPhrases
          .map((phrase, index) => {
            if (index === patternPhrases.length - 1 && patternPhrases.length > 1) {
              return `and ${phrase}`;
            }
            return phrase;
          })
          .join(", ")}.`
      : "Lately, your writing reflects a few recurring themes that feel closely connected.";

  if (!influences.length) {
    return baseline;
  }

  const influenceLine = `Often shaped by ${influences.slice(0, 3).map((item) => item.toLowerCase()).join(", ")}.`;
  return `${baseline} ${influenceLine}`;
};

const HomeSnapshotHubPage = () => {
  const { status } = useAuth();
  const [range, setRange] = useState("week");
  const [activeDomain, setActiveDomain] = useState<HomeAvatarDomain>("root");
  const { data: entries } = useEntries({ limit: 200 });
  const { getPatientLabel } = usePatientTranslation();
  const [snapshot, setSnapshot] = useState<{
    patterns: HomePatternCard[];
    timeRangeSummary: TimeRangeSummary;
    whatHelped: string[];
    prompts: string[];
    snapshotOverview?: string;
    impactAreas?: string[];
    influences?: string[];
    openQuestions?: string[];
    entryCount?: number;
    sourceEntryCount?: number;
    narrative?: {
      overTimeSummary?: string;
      recurringExperiences?: string[];
      impactAreas?: string[];
      relatedInfluences?: string[];
      questionsToExplore?: string[];
      highlights?: string[];
      shiftsOverTime?: string[];
      contextImpactSummary?: string;
    };
    rangeCoverage?: {
      requestedRangeKey?: string;
      effectiveRangeKey?: string;
      historySpanDays?: number;
      historyStartISO?: string | null;
      historyEndISO?: string | null;
      reason?: string | null;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeKey =
    range === "week" ? "last_7_days" : range === "month" ? "last_30_days" : "last_365_days";

  useEffect(() => {
    if (status !== "authed") {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<{ snapshot: any }>(`/derived/snapshot?rangeKey=${rangeKey}`)
      .then(({ snapshot }) => setSnapshot(snapshot))
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false));
  }, [rangeKey, status]);

  const patterns = snapshot?.patterns?.length ? snapshot.patterns : [];
  const narrative = snapshot?.narrative || {};
  const snapshotInfluences =
    narrative.relatedInfluences?.length ? narrative.relatedInfluences : snapshot?.influences || [];
  const snapshotImpactAreas =
    narrative.impactAreas?.length ? narrative.impactAreas : snapshot?.impactAreas || [];
  const snapshotNarrative = narrative.overTimeSummary?.trim()
    ? narrative.overTimeSummary
    : patterns.length || snapshotInfluences.length
      ? buildSnapshotSynthesis(patterns, snapshotInfluences)
      : "Add a few journal entries to unlock your snapshot patterns.";
  const narrativeHighlights = narrative.highlights || [];
  const snapshotQuestions = narrative.questionsToExplore || snapshot?.openQuestions || [];

  const rangeDays = range === "week" ? 7 : range === "month" ? 30 : 365;

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

  const evidenceUnitsInRange = useMemo(() => {
    return entriesInRange.flatMap((entry) => entry.evidenceUnits || []);
  }, [entriesInRange]);

  const severityToScore = (severity?: string | null) => {
    if (!severity) return null;
    const normalized = severity.toLowerCase();
    if (normalized.includes("severe")) return 3;
    if (normalized.includes("moderate")) return 2;
    if (normalized.includes("mild")) return 1;
    return null;
  };

  const triggerBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    evidenceUnitsInRange.forEach((unit) => {
      if (!unit.label.startsWith("CONTEXT_") && !unit.label.startsWith("IMPACT_")) return;
      const label = getPatientLabel(unit.label, unit.span);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        percent: total ? Math.round((count / total) * 100) : 0,
      }));
  }, [evidenceUnitsInRange, getPatientLabel]);

  const patternMetrics = useMemo<PatternMetric[]>(() => {
    const entryCountInRange = entriesInRange.length;
    const symptomUnits = evidenceUnitsInRange.filter((unit) => unit.label.startsWith("SYMPTOM_"));
    const intensityScores = symptomUnits
      .map((unit) => severityToScore(unit.attributes?.severity))
      .filter((value): value is number => value !== null);
    const avgScore = intensityScores.length
      ? intensityScores.reduce((sum, value) => sum + value, 0) / intensityScores.length
      : 0;
    let reflectiveLabel = "—";
    if (avgScore > 0) {
      if (avgScore >= 2.5) reflectiveLabel = "Overwhelming";
      else if (avgScore >= 1.5) reflectiveLabel = "Heavy";
      else reflectiveLabel = "Noticeable";
    }
    const contextUnits = evidenceUnitsInRange.filter(
      (unit) => unit.label.startsWith("CONTEXT_") || unit.label.startsWith("IMPACT_"),
    );
    const topContext = contextUnits.length
      ? (() => {
          const labelCounts = new Map<string, number>();
          contextUnits.forEach((unit) => {
            const label = getPatientLabel(unit.label, unit.span);
            labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
          });
          return (
            Array.from(labelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
          );
        })()
      : "—";

    return [
      {
        id: "metric-entries",
        label: "Entries logged",
        value: entryCountInRange ? `${entryCountInRange} total` : "No entries",
        delta: range === "week" ? "Last 7 days" : range === "month" ? "Last 30 days" : "Last 12 months",
        status: "up",
      },
      {
        id: "metric-emotion",
        label: "Emotional Load",
        value: reflectiveLabel,
        delta: avgScore ? (avgScore >= 2 ? "Heavier than usual" : "Manageable levels") : "Add more reflections",
        status: avgScore >= 2 ? "up" : "down",
      },
      {
        id: "metric-trigger",
        label: "Most common context",
        value: topContext || "—",
        delta: "From recent notes",
        status: "up",
      },
    ];
  }, [entriesInRange.length, evidenceUnitsInRange, getPatientLabel, range]);

  const moodMetric = patternMetrics.find((metric) => metric.id === "metric-emotion");
  const moodIntensity = moodMetric?.value === "Overwhelming" ? 0.9 : moodMetric?.value === "Heavy" ? 0.6 : 0.3;

  const influencesForPanel = useMemo<PatternInfluence[]>(() => {
    return snapshotInfluences.map((label) => ({
      id: label,
      label,
      direction: "steady",
      detail: "Recurring context",
      confidence: 80,
    }));
  }, [snapshotInfluences]);

  const impactAreasForPanel = useMemo<LifeAreaImpact[]>(() => {
    return snapshotImpactAreas.map((label) => ({
      id: label,
      label,
      score: 75,
      detail: "Noted in recent entries",
    }));
  }, [snapshotImpactAreas]);

  const sceneEmotions = useMemo<SceneEmotion[]>(() => {
    const map = new Map<string, { count: number; tone: SceneEmotion["tone"]; intensitySum: number }>();

    entriesInRange.forEach((entry) => {
      (entry.emotions || []).forEach((emotion) => {
        const current = map.get(emotion.label) || {
          count: 0,
          tone: emotion.tone as SceneEmotion["tone"],
          intensitySum: 0,
        };
        map.set(emotion.label, {
          count: current.count + 1,
          tone: current.tone,
          intensitySum: current.intensitySum + (emotion.intensity || 50),
        });
      });
    });

    return Array.from(map.entries())
      .map(([label, data]) => ({
        label,
        intensity: Math.round(data.intensitySum / data.count),
        tone: data.tone,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [entriesInRange]);

  return (
    <div className="relative min-h-screen pb-20">
      <div className="sticky top-0 z-50 overflow-hidden rounded-t-3xl border-b border-slate-200 bg-slate-50/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <PageHeader
            title="Interactive Dashboard"
            description="Explore your patterns in a reflective space."
            actions={<Tabs options={rangeOptions} activeId={range} onValueChange={setRange} />}
          />
        </div>
      </div>

      <div className="relative h-[45vh] w-full overflow-hidden bg-slate-50 transition-colors duration-1000">
        <HomeAvatarScene
          activeDomain={activeDomain}
          onSelectDomain={setActiveDomain}
          moodIntensity={moodIntensity}
          enableIdleWave
          emotions={sceneEmotions}
        />
        {activeDomain !== "root" && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
            <button
              type="button"
              onClick={() => setActiveDomain("root")}
              className="rounded-full border border-slate-200 bg-white/90 px-6 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur transition-transform hover:text-brand hover:scale-105"
            >
              Return to Overview
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 -mt-6 mx-auto w-full max-w-4xl px-4">
        <AnimatePresence mode="wait">
          {activeDomain === "root" && (
            <motion.div
              key="root"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="border-brand/10 bg-white/90 p-6 shadow-xl backdrop-blur">
                <div className="flex items-center gap-2 text-brand">
                  <Activity size={18} />
                  <h2 className="text-xl font-semibold">Current Snapshot</h2>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  {loading ? "Gathering your snapshot…" : snapshotNarrative}
                </p>
                <div className="mt-6">
                  <PatternHighlights metrics={patternMetrics} />
                </div>
                {narrativeHighlights.length > 0 && (
                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {narrativeHighlights.slice(0, 3).map((highlight, idx) => (
                      <div
                        key={`${highlight}-${idx}`}
                        className="rounded-lg bg-slate-50 p-2 text-xs font-medium text-slate-500"
                      >
                        {highlight}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {snapshot?.timeRangeSummary?.weekOverWeekDelta && (
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-slate-700">Weekly Shift</h3>
                  <p className="mt-2 text-slate-600">{snapshot.timeRangeSummary.weekOverWeekDelta}</p>
                </Card>
              )}
            </motion.div>
          )}

          {activeDomain === "symptom" && (
            <motion.div
              key="symptom"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-indigo-600">
                <Heart size={20} />
                <h3 className="text-xl font-semibold">My Emotional Weather</h3>
              </div>

              <Card className="p-6">
                <h4 className="text-base font-semibold text-slate-700">Recent Emotions</h4>
                <div className="mt-4">
                  <RecentEmotionsPulse entries={entriesInRange} />
                </div>
              </Card>

              <h4 className="text-base font-semibold text-slate-700">Detected Patterns</h4>
              <PatternCardGrid patterns={patterns} />
            </motion.div>
          )}

          {activeDomain === "context" && (
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-slate-600">
                <Brain size={20} />
                <h3 className="text-xl font-semibold">Influences</h3>
              </div>

              <InfluencesPanel influences={influencesForPanel} />

              <Card className="p-6">
                <h4 className="text-base font-semibold text-slate-700">Top Context Tags</h4>
                <div className="mt-4 space-y-3">
                  {triggerBreakdown.length ? (
                    triggerBreakdown.map((trigger) => (
                      <div key={trigger.label} className="flex items-center justify-between text-sm">
                        <span>{trigger.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full bg-slate-400" style={{ width: `${trigger.percent}%` }} />
                          </div>
                          <span className="w-8 text-right font-mono text-slate-400">{trigger.percent}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400">Add more entries to see contextual trends.</div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {activeDomain === "impact" && (
            <motion.div
              key="impact"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-orange-600">
                <Briefcase size={20} />
                <h3 className="text-xl font-semibold">Life Impact</h3>
              </div>

              <LifeAreasImpactPanel areas={impactAreasForPanel} />

              <Card className="p-6">
                <WhatHelpedSummary highlights={snapshot?.whatHelped || []} />
              </Card>

              <TodayPromptCard prompts={snapshotQuestions.slice(0, 2)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HomeSnapshotHubPage;
