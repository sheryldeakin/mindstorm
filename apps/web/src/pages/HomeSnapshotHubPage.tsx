import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PatternCardGrid from "../components/features/PatternCardGrid";
import RecentEmotionsPulse from "../components/features/RecentEmotionsPulse";
import InfluencesPanel from "../components/features/InfluencesPanel";
import LifeAreasImpactPanel from "../components/features/LifeAreasImpactPanel";
import CopingStrategiesPanel from "../components/features/CopingStrategiesPanel";
import { Card } from "../components/ui/Card";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import useEntries from "../hooks/useEntries";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import type { HomePatternCard, TimeRangeSummary } from "../types/home";
import type { PatternMetric } from "../types/journal";
import HomeAvatarScene, { type HomeAvatarDomain } from "../components/avatar/HomeAvatarScene";

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
  const { data: entries } = useEntries({ limit: 200 });
  const { getPatientLabel } = usePatientTranslation();
  const [activeDomain, setActiveDomain] = useState<HomeAvatarDomain>("root");
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
  const [loading, setLoading] = useState(false);

  const rangeKey = "last_7_days";
  const rangeCoverage = snapshot?.rangeCoverage;
  const effectiveRangeKey = rangeCoverage?.effectiveRangeKey || rangeKey;
  const rangeDays =
    effectiveRangeKey === "last_7_days"
      ? 7
      : effectiveRangeKey === "last_30_days"
        ? 30
        : effectiveRangeKey === "last_365_days"
          ? 365
          : null;

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

  const entriesInRange = useMemo(() => {
    if (!rangeDays) return entries;
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
      .slice(0, 4)
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
          return Array.from(labelCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
        })()
      : "—";

    return [
      {
        id: "metric-entries",
        label: "Entries logged",
        value: entryCountInRange ? `${entryCountInRange} total` : "No entries",
        delta: "Last 7 days",
        status: "up",
      },
      {
        id: "metric-emotion",
        label: "Emotional Load",
        value: reflectiveLabel,
        delta: avgScore ? (avgScore >= 2 ? "Heavier than usual" : "Manageable levels") : "Add more reflections",
        status: avgScore >= 2 ? "up" : "steady",
      },
      {
        id: "metric-trigger",
        label: "Most common context",
        value: topContext || "—",
        delta: "From recent notes",
        status: "steady",
      },
    ];
  }, [entriesInRange.length, evidenceUnitsInRange, getPatientLabel]);

  const moodMetric = patternMetrics.find((metric) => metric.id === "metric-emotion");
  const moodIntensity = moodMetric?.value === "Overwhelming" ? 0.9 : moodMetric?.value === "Heavy" ? 0.6 : 0.3;

  return (
    <div className="relative min-h-screen pb-20">
      <div className="relative h-[50vh] w-full overflow-hidden bg-slate-50 transition-colors duration-700">
        <HomeAvatarScene activeDomain={activeDomain} onSelectDomain={setActiveDomain} moodIntensity={moodIntensity} />
        {activeDomain !== "root" && (
          <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
            <button
              type="button"
              onClick={() => setActiveDomain("root")}
              className="rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur hover:text-brand"
            >
              Return to Center
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 -mt-10 mx-auto w-full max-w-5xl px-4">
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
                <h2 className="text-xl font-bold text-brand">Your Current Snapshot</h2>
                <p className="mt-3 text-sm text-slate-600">{loading ? "Gathering your snapshot…" : snapshotNarrative}</p>
                {narrativeHighlights.length > 0 && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
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
              <div className="grid grid-cols-3 gap-4 text-center text-xs uppercase tracking-[0.3em] text-slate-400">
                <div>Context</div>
                <div>Feelings</div>
                <div>Impact</div>
              </div>
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
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-900">My Emotional Weather</h3>
              </div>
              <PatternCardGrid patterns={patterns} onSelect={() => {}} />
              <RecentEmotionsPulse entries={entries} />
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
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-700">What's Influencing Me</h3>
              </div>
              <InfluencesPanel influences={snapshotInfluences} />
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-slate-700">Context categories</h4>
                <div className="mt-3 space-y-2">
                  {triggerBreakdown.length ? (
                    triggerBreakdown.map((trigger) => (
                      <div key={trigger.label} className="flex items-center justify-between text-sm text-slate-600">
                        <span>{trigger.label}</span>
                        <span className="font-mono text-xs text-slate-400">{trigger.percent}%</span>
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
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-orange-500" />
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-orange-800">Life Impact</h3>
              </div>
              <LifeAreasImpactPanel areas={snapshotImpactAreas} />
              <CopingStrategiesPanel strategies={{ userTagged: [], suggested: [] }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HomeSnapshotHubPage;
