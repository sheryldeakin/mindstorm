import { useEffect, useMemo, useState } from "react";
import PatternCardGrid from "../components/features/PatternCardGrid";
import { Card } from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import { apiFetch } from "../lib/apiClient";
import type { HomePatternCard, TimeRangeSummary } from "../types/home";
import type { WeeklySummary } from "../types/prepare";
import { useAuth } from "../contexts/AuthContext";

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

  const entryCount = snapshot?.entryCount ?? snapshot?.sourceEntryCount ?? 0;
  const hasEntries = entryCount > 0;
  const patterns = snapshot?.patterns?.length ? snapshot.patterns : [];
  const timeRangeSummary = snapshot?.timeRangeSummary || null;
  const helpedHighlights = snapshot?.whatHelped?.length ? snapshot.whatHelped : emptyHelpedHighlights;
  const gentlePrompts = snapshot?.prompts?.length ? snapshot.prompts : emptyPrompts;
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
  const rangeLabel =
    range === "week"
      ? "this week"
      : range === "month"
        ? "this month"
        : range === "year"
          ? "this year"
          : "all time";
  const weeklySubcopy =
    range === "week"
      ? "A snapshot of the current week."
      : range === "all"
        ? "Most recent week in your full history."
        : "Most recent week in this range.";
  const snapshotImpactAreas = snapshot?.impactAreas || [];
  const snapshotInfluences = snapshot?.influences || [];
  const snapshotQuestions = snapshot?.openQuestions || [];
  const emptyContextCopy = hasEntries
    ? "Not available yet."
    : "Add a few entries to see this.";
  const snapshotSynthesis = buildSnapshotSynthesis(patterns, snapshotInfluences);
  const snapshotNarrative =
    hasEntries && (patterns.length || snapshotInfluences.length)
      ? snapshotSynthesis
      : "Add a few journal entries to unlock your snapshot patterns.";

  return (
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
          <Tabs options={rangeOptions} activeId={range} onValueChange={setRange} />
          {(loading || stale) && <span className="small-label text-slate-400">Updating</span>}
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
        <div className="mt-6">
          {weeklyLoading ? (
            <p className="mt-3 text-sm text-slate-500">Loading weekly summary...</p>
          ) : weeklyError ? (
            <p className="mt-3 text-sm text-rose-600">{weeklyError}</p>
          ) : currentWeekSummary ? (
            <div className="ms-glass-surface rounded-2xl border p-4">
              <p className="small-label text-slate-400">
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
        </div>
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
        <PatternCardGrid patterns={patterns} />
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
  );
};

export default HomeDashboardPage;
