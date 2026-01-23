import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import PatternCardGrid from "../components/features/PatternCardGrid";
import { Card } from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import { apiFetch } from "../lib/apiClient";
import type { HomePatternCard, TimeRangeSummary } from "../types/home";
import type { WeeklySummary } from "../types/prepare";
import type { PatternDetail, PatternSummary } from "../types/patterns";
import { useAuth } from "../contexts/AuthContext";
import PatternDetailHeader from "../components/features/PatternDetailHeader";
import PatternTimelineChart from "../components/features/PatternTimelineChart";
import LifeAreasImpactPanel from "../components/features/LifeAreasImpactPanel";
import InfluencesPanel from "../components/features/InfluencesPanel";
import CopingStrategiesPanel from "../components/features/CopingStrategiesPanel";
import ExploreQuestionsPanel from "../components/features/ExploreQuestionsPanel";
import PatternHighlights from "../components/features/PatternHighlights";
import useEntries from "../hooks/useEntries";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import type { PatternMetric } from "../types/journal";
import RecentEmotionsPulse from "../components/features/RecentEmotionsPulse";
import Sparkline from "../components/charts/Sparkline";
import type { CheckInRecord } from "../types/checkIn";

const LIFE_AREA_DOMAINS = [
  "Work/School",
  "Relationships",
  "Energy and Self-care",
  "Motivation",
  "Feeling safe or steady",
  "Enjoyment and meaning",
];

const normalizeLabel = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const buildLifeAreaValues = (areas: string[]) => {
  const normalizedAreas = new Set(areas.map((area) => normalizeLabel(area)));
  return LIFE_AREA_DOMAINS.map((label) => {
    const normalizedLabel = normalizeLabel(label);
    const isMatch = Array.from(normalizedAreas).some((area) => area.includes(normalizedLabel) || normalizedLabel.includes(area));
    return {
      label,
      value: isMatch ? 0.62 : 0.18,
    };
  });
};

const LifeAreaRadar = ({ areas }: { areas: string[] }) => {
  const size = 280;
  const center = size / 2;
  const radius = 86;
  const levels = [0.33, 0.66, 1];
  const angleStep = (Math.PI * 2) / LIFE_AREA_DOMAINS.length;
  const values = buildLifeAreaValues(areas);

  const polarPoint = (value: number, index: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  const polygonPoints = values
    .map((item, index) => {
      const point = polarPoint(item.value, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const markerPoints = values.map((item, index) => polarPoint(item.value, index));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-[280px] w-[280px] overflow-visible text-slate-300">
      {levels.map((level) => {
        const levelPoints = LIFE_AREA_DOMAINS.map((_, index) => {
          const point = polarPoint(level, index);
          return `${point.x},${point.y}`;
        }).join(" ");
        return <polygon key={level} points={levelPoints} fill="none" stroke="currentColor" strokeWidth="0.8" />;
      })}
      {LIFE_AREA_DOMAINS.map((label, index) => {
        const point = polarPoint(1, index);
        const angle = -Math.PI / 2 + index * angleStep;
        const labelRadius = radius + 26;
        const labelPoint = {
          x: center + labelRadius * Math.cos(angle),
          y: center + labelRadius * Math.sin(angle),
        };
        const textAnchor = Math.cos(angle) > 0.2 ? "start" : Math.cos(angle) < -0.2 ? "end" : "middle";
        const dy = Math.sin(angle) > 0.2 ? "0.8em" : Math.sin(angle) < -0.2 ? "-0.2em" : "0.35em";
        const labelLines = label.split(" ");
        return (
          <g key={`axis-${index}`}>
            <line
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.7"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor={textAnchor}
              dy={dy}
              className="fill-slate-500 text-[9px] uppercase tracking-[0.18em]"
            >
              {labelLines.map((line, lineIndex) => (
                <tspan
                  key={`${label}-${lineIndex}`}
                  x={labelPoint.x}
                  dy={lineIndex === 0 ? 0 : "1.05em"}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      <polygon points={polygonPoints} fill="rgba(99, 128, 207, 0.18)" stroke="rgba(99, 128, 207, 0.45)" strokeWidth="1" />
      {markerPoints.map((point, index) => (
        <circle key={`marker-${index}`} cx={point.x} cy={point.y} r="2.4" fill="rgba(99, 128, 207, 0.9)" />
      ))}
      <circle cx={center} cy={center} r="1.6" fill="rgba(99, 128, 207, 0.55)" />
    </svg>
  );
};

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

const emptyHelpedHighlights: string[] = [];
const emptyPrompts: string[] = [];

const rangeOptions = [
  { id: "week", label: "Your week in patterns" },
  { id: "month", label: "Your month in patterns" },
  { id: "year", label: "Your year in patterns" },
  { id: "all", label: "All of your patterns" },
];

const rangeOptionMinimumDays: Record<string, number> = {
  week: 7,
  month: 30,
  year: 365,
};

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
  const [stale, setStale] = useState(true);
  const [loading, setLoading] = useState(false);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [patternList, setPatternList] = useState<PatternSummary[]>([]);
  const [patternDetail, setPatternDetail] = useState<PatternDetail | null>(null);
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternError, setPatternError] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [selectedPatternTitle, setSelectedPatternTitle] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: entries, loading: entriesLoading } = useEntries({ limit: 200 });
  const { getPatientLabel, getIntensityLabel } = usePatientTranslation();
  const [checkInSeries, setCheckInSeries] = useState<
    Array<{ id: string; label: string; values: number[]; points: number }>
  >([]);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const rangeKey =
    range === "week"
      ? "last_7_days"
      : range === "month"
        ? "last_30_days"
        : range === "year"
          ? "last_365_days"
          : "all_time";
  const headingLabel = rangeOptions.find((option) => option.id === range)?.label || "Your week in patterns";
  const rangeCoverage = snapshot?.rangeCoverage;
  const availableRangeOptions = useMemo(() => {
    if (!rangeCoverage?.historySpanDays) return rangeOptions;
    return rangeOptions.filter((option) => {
      if (option.id === "all") return true;
      const requiredDays = rangeOptionMinimumDays[option.id];
      if (!requiredDays) return true;
      return rangeCoverage.historySpanDays >= requiredDays;
    });
  }, [rangeCoverage?.historySpanDays]);

  useEffect(() => {
    if (!availableRangeOptions.length) return;
    if (!availableRangeOptions.some((option) => option.id === range)) {
      setRange(availableRangeOptions[availableRangeOptions.length - 1].id);
    }
  }, [availableRangeOptions, range]);
  const effectiveRangeKey = rangeCoverage?.effectiveRangeKey || rangeKey;
  const trendRangeKey = effectiveRangeKey || rangeKey;
  const rangeDays =
    trendRangeKey === "last_7_days"
      ? 7
      : trendRangeKey === "last_30_days"
        ? 30
        : trendRangeKey === "last_365_days"
          ? 365
          : null;

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
    if (!stale || status !== "authed") return undefined;
    let active = true;
    const poll = async () => {
      try {
        const response = await apiFetch<{ snapshot: any; stale?: boolean }>(
          `/derived/snapshot?rangeKey=${rangeKey}`,
        );
        if (!active) return;
        setSnapshot(response.snapshot);
        setStale(Boolean(response.stale));
      } catch {
        if (!active) return;
      }
    };
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [rangeKey, stale, status]);

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

  useEffect(() => {
    if (status !== "authed") {
      setPatternList([]);
      setPatternDetail(null);
      setPatternError(null);
      setPatternLoading(false);
      return;
    }
    setPatternLoading(true);
    setPatternError(null);
    const query = selectedPatternId ? `&patternId=${selectedPatternId}` : "";
    apiFetch<{ patterns: PatternSummary[]; detail: PatternDetail | null }>(
      `/derived/patterns?rangeKey=${rangeKey}${query}`,
    )
      .then(({ patterns, detail }) => {
        setPatternList(patterns || []);
        setPatternDetail(detail || null);
      })
      .catch((err) => {
        setPatternError(err instanceof Error ? err.message : "Failed to load patterns.");
        setPatternList([]);
        setPatternDetail(null);
      })
      .finally(() => setPatternLoading(false));
  }, [rangeKey, selectedPatternId, status]);

  useEffect(() => {
    if (status !== "authed") {
      setCheckInSeries([]);
      setCheckInLoading(false);
      return;
    }
    const resolvedRangeKey = snapshot?.rangeCoverage?.effectiveRangeKey || rangeKey;
    const today = new Date();
    const days =
      resolvedRangeKey === "last_7_days"
        ? 7
        : resolvedRangeKey === "last_30_days"
          ? 30
          : resolvedRangeKey === "last_365_days"
            ? 365
            : 7;
    const dates = Array.from({ length: days }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - index));
      return date.toISOString().slice(0, 10);
    });
    let active = true;
    setCheckInLoading(true);
    Promise.all(
      dates.map((dateISO) =>
        apiFetch<{ checkIn: CheckInRecord | null }>(`/check-ins/${dateISO}`)
          .then((response) => response.checkIn)
          .catch(() => null),
      ),
    )
      .then((checkIns) => {
        if (!active) return;
        const seriesMap = new Map<
          string,
          { id: string; label: string; values: number[]; points: number; lastValue: number | null }
        >();

        checkIns.forEach((record) => {
          if (!record) return;
          record.metrics.forEach((metric) => {
            if (!seriesMap.has(metric.id)) {
              seriesMap.set(metric.id, {
                id: metric.id,
                label: metric.label,
                values: [],
                points: 0,
                lastValue: null,
              });
            }
          });
        });

        dates.forEach((dateISO, index) => {
          const dayMetrics = checkIns[index]?.metrics || [];
          const dayMap = new Map(dayMetrics.map((metric) => [metric.id, metric.value]));
          seriesMap.forEach((series) => {
            if (dayMap.has(series.id)) {
              const value = dayMap.get(series.id) as number;
              series.values.push(value);
              series.lastValue = value;
              series.points += 1;
            } else if (series.lastValue !== null) {
              series.values.push(series.lastValue);
            } else {
              series.values.push(0);
            }
          });
        });

        const nextSeries = Array.from(seriesMap.values()).filter((series) => series.points > 0);
        setCheckInSeries(nextSeries);
      })
      .finally(() => {
        if (active) setCheckInLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rangeKey, snapshot?.rangeCoverage?.effectiveRangeKey, status]);

  useEffect(() => {
    if (!selectedPatternTitle || selectedPatternId || !patternList.length) return;
    const matched = patternList.find(
      (pattern) => normalizeLabel(pattern.title) === normalizeLabel(selectedPatternTitle),
    );
    if (matched) {
      setSelectedPatternId(matched.id);
    }
  }, [patternList, selectedPatternId, selectedPatternTitle]);

  const entryCount = snapshot?.entryCount ?? snapshot?.sourceEntryCount ?? 0;
  const hasEntries = entryCount > 0;
  const patterns = snapshot?.patterns?.length ? snapshot.patterns : [];
  const timeRangeSummary = snapshot?.timeRangeSummary || null;
  const helpedHighlights = snapshot?.whatHelped?.length ? snapshot.whatHelped : emptyHelpedHighlights;
  const gentlePrompts = snapshot?.prompts?.length ? snapshot.prompts : emptyPrompts;
  const rangeLabel =
    effectiveRangeKey === "last_7_days"
      ? "this week"
      : effectiveRangeKey === "last_30_days"
        ? "this month"
        : effectiveRangeKey === "last_365_days"
          ? "this year"
          : "all time";
  const rangeNotice =
    rangeCoverage && rangeCoverage.effectiveRangeKey && rangeCoverage.effectiveRangeKey !== rangeKey
      ? `You don’t have ${range === "week" ? "7 days" : range === "month" ? "30 days" : "365 days"} of entries yet. This view reflects all available writing so far.`
      : null;
  const narrative = snapshot?.narrative || {};
  const snapshotImpactAreas =
    narrative.impactAreas?.length ? narrative.impactAreas : snapshot?.impactAreas || [];
  const snapshotInfluences =
    narrative.relatedInfluences?.length ? narrative.relatedInfluences : snapshot?.influences || [];
  const snapshotQuestions =
    narrative.questionsToExplore?.length ? narrative.questionsToExplore : snapshot?.openQuestions || [];
  const emptyContextCopy = hasEntries
    ? "Not available yet."
    : "Add a few entries to see this.";
  const snapshotSynthesis = buildSnapshotSynthesis(patterns, snapshotInfluences);
  const snapshotNarrative = narrative.overTimeSummary?.trim()
    ? narrative.overTimeSummary
    : hasEntries && (patterns.length || snapshotInfluences.length)
      ? snapshotSynthesis
      : "Add a few journal entries to unlock your snapshot patterns.";
  const narrativeHighlights = narrative.highlights || [];
  const narrativeShifts = narrative.shiftsOverTime || [];
  const contextImpactSummary = narrative.contextImpactSummary?.trim();
  const matchedPattern = selectedPatternTitle
    ? patternList.find((pattern) => normalizeLabel(pattern.title) === normalizeLabel(selectedPatternTitle))
    : null;
  const activePatternDetail =
    matchedPattern && patternDetail?.id === matchedPattern.id ? patternDetail : null;
  const evidenceSnippets = matchedPattern?.evidence || [];
  const hasDetailContent =
    evidenceSnippets.length ||
    (activePatternDetail?.timeline?.week?.points || []).length ||
    (activePatternDetail?.timeline?.month?.points || []).length ||
    (activePatternDetail?.lifeAreas || []).length ||
    (activePatternDetail?.influences || []).length ||
    (activePatternDetail?.copingStrategies?.userTagged || []).length ||
    (activePatternDetail?.copingStrategies?.suggested || []).length ||
    (activePatternDetail?.exploreQuestions || []).length;

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

  const pulseEntries = useMemo(() => {
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
      if (!unit.label.startsWith("CONTEXT_")) return;
      const label = getPatientLabel(unit.label);
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
    const avgIntensityLabel = avgScore
      ? getIntensityLabel(avgScore >= 2.5 ? "SEVERE" : avgScore >= 1.5 ? "MODERATE" : "MILD")
      : "—";
    const contextUnits = evidenceUnitsInRange.filter((unit) => unit.label.startsWith("CONTEXT_"));
    const topContext = contextUnits.length
      ? getPatientLabel(
          contextUnits
            .map((unit) => unit.label)
            .sort((a, b) => {
              const countA = contextUnits.filter((unit) => unit.label === a).length;
              const countB = contextUnits.filter((unit) => unit.label === b).length;
              return countB - countA;
            })[0],
        )
      : "—";

    return [
      {
        id: "metric-entries",
        label: "Entries logged",
        value: entryCountInRange ? `${entryCountInRange} total` : "No entries",
        delta:
          trendRangeKey === "last_7_days"
            ? "Last 7 days"
            : trendRangeKey === "last_30_days"
              ? "Last 30 days"
              : "Last 365 days",
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
  }, [entriesInRange, evidenceUnitsInRange, getIntensityLabel, getPatientLabel, trendRangeKey]);

  return (
    <>
      <div className="space-y-12 text-slate-900">
      <section className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="small-label text-brandLight">Home</p>
          <h2 className="mt-2 text-3xl font-semibold">{headingLabel}</h2>
          <p className="mt-2 text-sm text-slate-500">
            A quick read on how your nervous system shifted over the selected range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs options={availableRangeOptions} activeId={range} onValueChange={setRange} />
          {(loading || stale) && <span className="small-label text-slate-400">Updating your snapshot...</span>}
        </div>
      </section>
      {rangeNotice ? (
        <Card className="border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          {rangeNotice}
        </Card>
      ) : null}

      <section className="space-y-6">
        <div>
          <p className="small-label text-slate-400">Nervous system trends</p>
          <h3 className="mt-2 text-2xl font-semibold">How your signals are shifting</h3>
          <p className="mt-2 text-sm text-slate-500">
            Signals, intensity, and context from your journal entries in this range.
          </p>
        </div>
        <PatternHighlights metrics={patternMetrics} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-xl font-semibold">Recent pulse</h3>
            <p className="mt-2 text-sm text-slate-500">
              Emotions you logged over {rangeLabel}.
            </p>
            <div className="mt-4">
              {entriesLoading ? (
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ) : (
                <RecentEmotionsPulse entries={pulseEntries} />
              )}
            </div>
          </Card>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold">Your tracked stats</h3>
              <p className="mt-2 text-sm text-slate-500">
                Check-in sliders from this range.
              </p>
              <div className="mt-4 space-y-3">
                {checkInLoading ? (
                  <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ) : checkInSeries.length ? (
                  checkInSeries.map((metric) => (
                    <div key={metric.id} className="rounded-2xl border border-slate-100 bg-white/70 p-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{metric.label}</span>
                        <span>Last 7 days</span>
                      </div>
                      <div className="mt-2">
                        <Sparkline data={metric.values} width={200} height={56} showPoints={false} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Log a check-in to see your tracked stats.</p>
                )}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold">Context categories</h3>
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
          </div>
        </div>
      </section>

      <Card className="ms-elev-3 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-semibold">Your current snapshot</h3>
          <p className="small-label text-slate-400">
            Updated today • Based on {entryCount} entries from {rangeLabel}
          </p>
        </div>
        <p className="mt-3 text-sm text-slate-600">{snapshotNarrative}</p>
        {contextImpactSummary ? (
          <p className="mt-2 text-sm text-slate-600">{contextImpactSummary}</p>
        ) : null}
        {(narrativeHighlights.length || narrativeShifts.length) ? (
          <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <div>
              <p className="small-label text-slate-400">Highlights</p>
              <div className="mt-2 space-y-1">
                {(narrativeHighlights.length ? narrativeHighlights : ["No highlights captured yet."])
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
              <p className="small-label text-slate-400">Shifts over time</p>
              <div className="mt-2 space-y-1">
                {(narrativeShifts.length ? narrativeShifts : ["No shifts captured yet."])
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
        ) : null}
        <div className="mt-6 grid gap-6 text-sm text-slate-600 lg:grid-cols-[1.3fr_2fr]">
          <div className="space-y-3">
            <p className="small-label text-slate-400">Life areas affected</p>
            <div className="flex items-start">
              <LifeAreaRadar areas={snapshotImpactAreas} />
            </div>
          </div>
          <div className="space-y-3">
            <p className="small-label text-slate-400">Influences</p>
            <div className="space-y-2">
              {(snapshotInfluences.length ? snapshotInfluences : [emptyContextCopy])
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
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <p className="small-label text-slate-400">Questions you might explore</p>
          <div className="space-y-2">
            {(snapshotQuestions.length ? snapshotQuestions : [emptyContextCopy])
              .slice(0, 3)
              .map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </div>
              ))}
          </div>
        </div>
      </Card>

      <section className="space-y-6">
        <PatternCardGrid
          patterns={patterns}
          selectedTitle={selectedPatternTitle}
          onSelect={(pattern) => {
            setSelectedPatternTitle(pattern.title);
            setDrawerOpen(true);
            const matched = patternList.find(
              (item) => normalizeLabel(item.title) === normalizeLabel(pattern.title),
            );
            setSelectedPatternId(matched?.id ?? null);
          }}
        />
      </section>

      <section className="grid gap-10 md:grid-cols-[2fr_1fr]">
        <Card className="ms-elev-2 p-6">
          <p className="small-label text-slate-400">This week, in context</p>
          <h3 className="mt-2 text-xl font-semibold">How it's changing</h3>
          {timeRangeSummary ? (
            <>
              <p className="mt-1 text-sm text-slate-500">{timeRangeSummary.weekOverWeekDelta}</p>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="ms-glass-surface rounded-2xl border p-4">
                  <p className="small-label text-slate-400">Missing signals</p>
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
                <div className="ms-glass-surface rounded-2xl border p-4">
                  <p className="small-label text-slate-400">What helped</p>
                  <p className="mt-2 text-sm text-slate-500">Supports that softened the week.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {helpedHighlights.length ? (
                      helpedHighlights.map((item) => (
                        <span
                          key={item}
                          className="ms-glass-pill rounded-full border border-emerald-200/60 px-3 py-1 text-xs text-emerald-700"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        {hasEntries ? "No supports captured yet." : "Add entries to see supports here."}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {hasEntries ? "No change summary available yet." : "Add entries to see changes over time."}
            </p>
          )}
        </Card>
        <Card className="ms-elev-1 p-6">
          <h3 className="text-lg font-semibold text-slate-700">Gentle prompts</h3>
          <p className="mt-1 text-sm text-slate-500">Small nudges to reflect on today.</p>
          <div className="mt-4 space-y-3">
            {gentlePrompts.length ? (
              gentlePrompts.map((prompt) => (
                <div key={prompt} className="ms-glass-surface rounded-2xl border px-4 py-3 text-sm text-slate-600">
                  {prompt}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
                {hasEntries ? "No prompts yet." : "Add a few entries to generate prompts."}
              </div>
            )}
          </div>
        </Card>
      </section>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl border-l border-slate-200 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pattern detail</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {matchedPattern?.title || selectedPatternTitle || "Pattern"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close pattern drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {patternLoading ? (
                <Card className="p-6 text-sm text-slate-500">Loading pattern details...</Card>
              ) : patternError ? (
                <Card className="p-6 text-sm text-rose-600">{patternError}</Card>
              ) : !hasDetailContent ? (
                <Card className="p-8 text-center">
                  <div className="text-xl">🌱</div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-800">
                    This pattern is still emerging
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Write a few more journal entries about this theme to unlock evidence and deeper insights.
                  </p>
                </Card>
              ) : (
                <>
                  {evidenceSnippets.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-800">Evidence drawer</h3>
                        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          {evidenceSnippets.length} snippets
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {evidenceSnippets.map((quote) => (
                          <div key={quote} className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600">
                            “{quote}”
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {activePatternDetail && (
                    <>
                      <PatternDetailHeader
                        title={activePatternDetail.title}
                        summary={activePatternDetail.summary}
                        phrases={activePatternDetail.phrases}
                        paraphrase={activePatternDetail.paraphrase}
                        rangeLabel={activePatternDetail.rangeLabel}
                        intensityLabel={activePatternDetail.intensityLabel}
                      />
                      {activePatternDetail.timeline?.week ? (
                        <PatternTimelineChart
                          scaleLabel={activePatternDetail.timeline.week.scaleLabel}
                          points={activePatternDetail.timeline.week.points}
                          spanLinks={activePatternDetail.timeline.week.spanLinks}
                        />
                      ) : null}
                      {activePatternDetail.timeline?.month ? (
                        <PatternTimelineChart
                          scaleLabel={activePatternDetail.timeline.month.scaleLabel}
                          points={activePatternDetail.timeline.month.points}
                          spanLinks={activePatternDetail.timeline.month.spanLinks}
                        />
                      ) : null}
                      {activePatternDetail.lifeAreas?.length ? (
                        <LifeAreasImpactPanel areas={activePatternDetail.lifeAreas} />
                      ) : null}
                      {activePatternDetail.influences?.length ? (
                        <InfluencesPanel influences={activePatternDetail.influences} />
                      ) : null}
                      {(activePatternDetail.copingStrategies?.userTagged?.length ||
                        activePatternDetail.copingStrategies?.suggested?.length) && (
                        <CopingStrategiesPanel strategies={activePatternDetail.copingStrategies} />
                      )}
                      {activePatternDetail.exploreQuestions?.length ? (
                        <ExploreQuestionsPanel questions={activePatternDetail.exploreQuestions} />
                      ) : null}
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default HomeDashboardPage;
