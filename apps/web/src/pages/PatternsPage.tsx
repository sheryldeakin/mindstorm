import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, GitGraph, LayoutGrid } from "lucide-react";
import clsx from "clsx";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import PageHeader from "../components/layout/PageHeader";
import PatternStream from "../components/features/PatternStream";
import { Card } from "../components/ui/Card";
import CopingStrategiesPanel from "../components/features/CopingStrategiesPanel";
import ExploreQuestionsPanel from "../components/features/ExploreQuestionsPanel";
import InfluencesPanel from "../components/features/InfluencesPanel";
import LifeAreasImpactPanel from "../components/features/LifeAreasImpactPanel";
import PatternDetailHeader from "../components/features/PatternDetailHeader";
import PatternTimelineChart from "../components/features/PatternTimelineChart";
import Tabs from "../components/ui/Tabs";
import useEntries from "../hooks/useEntries";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import { buildStreamData } from "../lib/vizUtils";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import type { PatternMetric } from "../types/journal";
import type { PatternDetail, PatternSummary } from "../types/patterns";

const tabOptions = [
  { id: "week", label: "This week" },
  { id: "month", label: "30 days" },
  { id: "quarter", label: "90 days" },
];

const rangeOptions = [
  { id: "last_7_days", label: "7 days" },
  { id: "last_30_days", label: "30 days" },
  { id: "last_90_days", label: "90 days" },
  { id: "last_365_days", label: "365 days" },
  { id: "all_time", label: "All time" },
];

const timelineOptions = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const normalizeThemeLabel = (value: string) =>
  value.toLowerCase().replace(/[_-]/g, " ").trim();

const PatternsPage = () => {
  const { status } = useAuth();
  const { getPatientLabel, getIntensityLabel } = usePatientTranslation();
  const [range, setRange] = useState("week");
  const [patternRange, setPatternRange] = useState("last_30_days");
  const [timelineScale, setTimelineScale] = useState<"week" | "month">("week");
  const [patternList, setPatternList] = useState<PatternSummary[]>([]);
  const [patternDetail, setPatternDetail] = useState<PatternDetail | null>(null);
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string>("");
  const { data: entries, loading: entriesLoading } = useEntries({ limit: 200 });
  const [series, setSeries] = useState<ThemeSeries[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "factors" | "impact">("overview");
  const streamRangeKey = patternRange;

  const rangeDays = range === "week" ? 7 : range === "month" ? 30 : 90;

  const entriesInRange = useMemo(() => {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (rangeDays - 1),
    );
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

  const emotionFrequency = useMemo(() => {
    const counts = new Map<string, number>();
    evidenceUnitsInRange.forEach((unit) => {
      if (!unit.label.startsWith("SYMPTOM_")) return;
      if (unit.label === "SYMPTOM_RISK") return;
      const patientLabel = getPatientLabel(unit.label, unit.span);
      counts.set(patientLabel, (counts.get(patientLabel) || 0) + 1);
    });
    const riskCount = evidenceUnitsInRange.filter((unit) => unit.label === "SYMPTOM_RISK").length;
    if (riskCount > 0) {
      counts.set("Safety Support", (counts.get("Safety Support") || 0) + riskCount);
    }
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => ({
        label,
        value: total ? Math.round((count / total) * 100) : 0,
      }));
  }, [evidenceUnitsInRange, getPatientLabel]);

  const triggerBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    evidenceUnitsInRange.forEach((unit) => {
      if (!unit.label.startsWith("CONTEXT_")) return;
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
    const entryCount = entriesInRange.length;
    const symptomUnits = evidenceUnitsInRange.filter((unit) => unit.label.startsWith("SYMPTOM_"));
    const intensityScores = symptomUnits
      .map((unit) => severityToScore(unit.attributes?.severity))
      .filter((value): value is number => value !== null);
    const avgScore = intensityScores.length
      ? intensityScores.reduce((sum, value) => sum + value, 0) / intensityScores.length
      : 0;
    const avgIntensityLabel = avgScore
      ? getIntensityLabel(avgScore >= 2.5 ? "SEVERE" : avgScore >= 1.5 ? "MODERATE" : "MILD")
      : "—";
    const contextUnits = evidenceUnitsInRange.filter((unit) => unit.label.startsWith("CONTEXT_"));
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
        value: entryCount ? `${entryCount} total` : "No entries",
        delta: range === "week" ? "Last 7 days" : range === "month" ? "Last 30 days" : "Last 90 days",
        status: "up",
      },
      {
        id: "metric-emotion",
        label: "Average signal intensity",
        value: avgScore ? avgIntensityLabel : "—",
        delta: avgScore ? "Across recent signals" : "Add more reflections",
        status: avgScore >= 2 ? "up" : "down",
      },
      {
        id: "metric-trigger",
        label: "Most common context",
        value: topContext || "—",
        delta: topContext !== "—" ? "Often mentioned" : "Waiting on context signals",
        status: "steady",
      },
    ];
  }, [entriesInRange, evidenceUnitsInRange, range, getIntensityLabel, getPatientLabel]);

  useEffect(() => {
    if (status !== "authed") {
      setPatternList([]);
      setPatternDetail(null);
      setSelectedPatternId("");
      return;
    }
    setPatternLoading(true);
    setPatternError(null);
    const query = selectedPatternId ? `&patternId=${selectedPatternId}` : "";
    apiFetch<{ patterns: PatternSummary[]; detail: PatternDetail | null }>(
      `/derived/patterns?rangeKey=${patternRange}${query}`,
    )
      .then(({ patterns, detail }) => {
        setPatternList(patterns || []);
        setPatternDetail(detail);
        if (!selectedPatternId && detail?.id) {
          setSelectedPatternId(detail.id);
        }
      })
      .catch((err) => {
        setPatternError(err instanceof Error ? err.message : "Failed to load patterns.");
        setPatternList([]);
        setPatternDetail(null);
      })
      .finally(() => setPatternLoading(false));
  }, [patternRange, selectedPatternId, status]);

  useEffect(() => {
    if (status !== "authed") {
      setSeries([]);
      setSeriesLoading(false);
      setSeriesError(null);
      return;
    }

    setSeriesLoading(true);
    setSeriesError(null);

    apiFetch<{ series: ThemeSeries[] }>(
      `/derived/theme-series?rangeKey=${streamRangeKey}`,
    )
      .then(({ series: nextSeries }) => {
        setSeries(nextSeries || []);
      })
      .catch((err) => {
        setSeriesError(
          err instanceof Error ? err.message : "Failed to load pattern series.",
        );
        setSeries([]);
      })
      .finally(() => setSeriesLoading(false));
  }, [status, streamRangeKey]);

  const timelineSeries = patternDetail?.timeline?.[timelineScale];
  const selectedPattern = patternList.find((pattern) => pattern.id === selectedPatternId) || patternList[0];
  const selectedEvidence = selectedPattern?.evidence || [];

  const streamData = useMemo(
    () => buildStreamData(series, getPatientLabel, streamRangeKey),
    [getPatientLabel, series, streamRangeKey],
  );

  const themes = streamData.keys;

  useEffect(() => {
    if (!themes.length) return;
    if (!selectedTheme || !themes.includes(selectedTheme)) {
      setSelectedTheme(themes[0]);
    }
  }, [selectedTheme, themes]);

  const activeTheme = selectedTheme || themes[0] || null;

  const matchedPattern = useMemo(() => {
    if (!activeTheme) return null;
    const normalized = normalizeThemeLabel(activeTheme);
    return patternList.find(
      (pattern) => normalizeThemeLabel(pattern.title) === normalized,
    );
  }, [activeTheme, patternList]);

  useEffect(() => {
    if (matchedPattern && matchedPattern.id !== selectedPatternId) {
      setSelectedPatternId(matchedPattern.id);
    }
  }, [matchedPattern, selectedPatternId]);

  const activePatternDetail =
    matchedPattern && patternDetail?.id === matchedPattern.id ? patternDetail : null;

  const overviewTimeline = activePatternDetail?.timeline?.[timelineScale];
  const overviewPoints = overviewTimeline?.points || [];
  const overviewMaxIntensity = Math.max(
    ...overviewPoints.map((point) => point.intensity),
    0,
  );

  const overviewEvidence = matchedPattern?.evidence || [];
  const hasEvidence = overviewEvidence.length > 0;
  const hasInfluences = (activePatternDetail?.influences || []).length > 0;
  const hasImpact = (activePatternDetail?.lifeAreas || []).length > 0;
  const hasCoping =
    (activePatternDetail?.copingStrategies?.userTagged || []).length > 0 ||
    (activePatternDetail?.copingStrategies?.suggested || []).length > 0;
  const hasQuestions = (activePatternDetail?.exploreQuestions || []).length > 0;
  const isMature =
    [hasEvidence, hasInfluences, hasImpact].filter(Boolean).length >= 2;

  const availableTabs = useMemo(
    () =>
      [
        { id: "overview", label: "Overview", icon: Activity, show: true },
        { id: "factors", label: "Connected", icon: GitGraph, show: hasInfluences },
        { id: "impact", label: "Life Impact", icon: LayoutGrid, show: hasImpact },
      ].filter((tab) => tab.show),
    [hasInfluences, hasImpact],
  );

  useEffect(() => {
    if (!availableTabs.find((tab) => tab.id === detailTab)) {
      setDetailTab("overview");
    }
  }, [availableTabs, detailTab]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <PageHeader
        pageId="patterns"
        title="Emotional Weather"
        description="Visualize how your feelings and experiences flow over time."
      />

      <div className="bg-white rounded-3xl p-1 shadow-sm border border-slate-200 mb-6">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Select a flow to explore
          </h3>
        </div>
        <div className="w-full">
          {seriesLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Reading the weather...
            </div>
          ) : seriesError ? (
            <div className="h-full flex items-center justify-center text-sm text-rose-600">
              {seriesError}
            </div>
          ) : streamData.data.length ? (
            <PatternStream
              series={series}
              onSelectTheme={setSelectedTheme}
              activeTheme={activeTheme}
              rangeKey={streamRangeKey}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Add more entries to see your emotional weather.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(activeTheme || matchedPattern || activePatternDetail) && (
          <motion.div
            key={`explorer-${activeTheme || matchedPattern?.id || "empty"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-slate-200 bg-slate-50/50 overflow-hidden mb-10"
          >
            {!isMature ? (
              <div className="p-8">
                <Card className="p-8 bg-white/60 backdrop-blur-md border-indigo-50 text-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-xl">
                    🌱
                  </div>
                  <h3 className="text-xl font-display font-bold text-slate-800">
                    {(matchedPattern?.title || activePatternDetail?.title || activeTheme || "This pattern") + " is emerging"}
                  </h3>
                  <p className="text-slate-600 mt-2 max-w-md mx-auto">
                    We are starting to see this theme, but we need a bit more journaling to understand what connects to it.
                  </p>
                  <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 inline-block text-left">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                      How to unlock insights
                    </h4>
                    <ul className="text-sm text-slate-600 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-slate-400">○</span>
                        Write about where you feel this (for example, at work or at home).
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-slate-400">○</span>
                        Note what seems to influence it (sleep, stress, social time).
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>
            ) : (
              <>
                <div className="bg-white px-8 py-6 border-b border-slate-100 flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">
                      {matchedPattern?.title || activePatternDetail?.title || activeTheme || "Pattern"}
                    </h2>
                    <p className="text-slate-500 mt-1">
                      {activePatternDetail?.summary || "Pattern detail available."}
                    </p>
                  </div>
                  {availableTabs.length > 1 && (
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      {availableTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDetailTab(tab.id as typeof detailTab)}
                          className={clsx(
                            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                            detailTab === tab.id
                              ? "bg-white text-brand shadow-sm"
                              : "text-slate-500 hover:text-slate-700",
                          )}
                        >
                          <tab.icon size={14} />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-8">
                  {detailTab === "overview" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {overviewPoints.length > 0 && (
                        <Card className="p-6">
                          <div className="mb-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                              {overviewTimeline?.scaleLabel || "Intensity over time"}
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-800">
                              Recent pattern movement
                            </h3>
                          </div>
                          <div className="h-32 w-full bg-slate-50 rounded-xl flex items-end p-4 gap-1 relative overflow-hidden">
                            {overviewPoints.map((point, index) => {
                              const height = overviewMaxIntensity
                                ? (point.intensity / overviewMaxIntensity) * 100
                                : 0;
                              return (
                                <div
                                  key={`${point.id}-${index}`}
                                  className="flex-1 bg-indigo-300/50 rounded-t-sm hover:bg-indigo-400 transition-colors"
                                  style={{ height: `${height}%` }}
                                  title={point.label}
                                />
                              );
                            })}
                          </div>
                        </Card>
                      )}
                      <div className="space-y-4">
                        {hasCoping && activePatternDetail?.copingStrategies && (
                          <CopingStrategiesPanel strategies={activePatternDetail.copingStrategies} />
                        )}
                        {hasEvidence && (
                          <Card className="p-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-slate-800">Evidence drawer</h3>
                              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                {overviewEvidence.length} snippets
                              </span>
                            </div>
                            <div className="mt-4 space-y-3">
                              {overviewEvidence.map((quote, index) => (
                                <div
                                  key={`${quote}-${index}`}
                                  className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600"
                                >
                                  “{quote}”
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}

                  {detailTab === "factors" && hasInfluences && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfluencesPanel influences={activePatternDetail?.influences || []} />
                      {hasQuestions && (
                        <ExploreQuestionsPanel questions={activePatternDetail?.exploreQuestions || []} />
                      )}
                    </div>
                  )}

                  {detailTab === "impact" && hasImpact && (
                    <div>
                      <LifeAreasImpactPanel areas={activePatternDetail?.lifeAreas || []} />
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 pt-10">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
          More Patterns
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-10 text-slate-900">
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Range</p>
              <h2 className="mt-2 text-2xl font-semibold">Patterns over time</h2>
            </div>
            <Tabs options={rangeOptions} activeId={patternRange} onValueChange={setPatternRange} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-brandLight">Patterns</p>
              <h2 className="mt-2 text-2xl font-semibold">Deep dive into one pattern</h2>
            </div>
            <Tabs options={timelineOptions} activeId={timelineScale} onValueChange={setTimelineScale} />
          </div>
          <div className="flex flex-wrap gap-3">
            {patternLoading ? (
              <span className="text-sm text-slate-500">Loading patterns...</span>
            ) : patternError ? (
              <span className="text-sm text-rose-600">{patternError}</span>
            ) : patternList.length ? (
              patternList.map((pattern) => (
                <button
                  key={pattern.id}
                  type="button"
                  onClick={() => setSelectedPatternId(pattern.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedPatternId === pattern.id
                      ? "border-brand/40 bg-brand/5 text-brand"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand/30"
                  }`}
                >
                  {pattern.title}
                </button>
              ))
            ) : (
              <span className="text-sm text-slate-500">Add more entries to surface patterns.</span>
            )}
          </div>
          {patternList.length ? (
            <div className="space-y-4">
              <Card className="p-5 text-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Evidence drawer</p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {selectedPattern ? `${selectedPattern.title} evidence` : "Pattern evidence"}
                    </h3>
                  </div>
                  {selectedPattern && (
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {selectedEvidence.length ? `${selectedEvidence.length} snippets` : "No snippets yet"}
                    </span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {selectedEvidence.length ? (
                    selectedEvidence.map((quote) => (
                      <div key={quote} className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600">
                        “{quote}”
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No evidence snippets available yet.</p>
                  )}
                </div>
              </Card>
            </div>
          ) : null}
          {patternDetail ? (
            <>
              <PatternDetailHeader
                title={patternDetail.title}
                summary={patternDetail.summary}
                phrases={patternDetail.phrases}
                paraphrase={patternDetail.paraphrase}
                rangeLabel={patternDetail.rangeLabel}
                intensityLabel={patternDetail.intensityLabel}
              />
              {timelineSeries ? (
                <PatternTimelineChart
                  scaleLabel={timelineSeries.scaleLabel}
                  points={timelineSeries.points}
                  spanLinks={timelineSeries.spanLinks}
                />
              ) : (
                <Card className="p-4 text-sm text-slate-500">Timeline not available yet.</Card>
              )}
              <div className="grid gap-6 lg:grid-cols-2">
                <LifeAreasImpactPanel areas={patternDetail.lifeAreas} />
                <InfluencesPanel influences={patternDetail.influences} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <CopingStrategiesPanel strategies={patternDetail.copingStrategies} />
                <ExploreQuestionsPanel questions={patternDetail.exploreQuestions} />
              </div>
            </>
          ) : (
            <Card className="p-6 text-sm text-slate-500">
              {patternLoading ? "Building your pattern detail..." : "No pattern detail available yet."}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

export default PatternsPage;
