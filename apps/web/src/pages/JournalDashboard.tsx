import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntryCard from "../components/features/EntryCard";
import SignalChips from "../components/features/SignalChips";
import InsightCard from "../components/features/InsightCard";
import JournalTimeline from "../components/features/JournalTimeline";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import useEntries from "../hooks/useEntries";
import useInsights from "../hooks/useInsights";
import PageHeader from "../components/layout/PageHeader";

const QUICK_FILTER_DEFAULT = "All feelings";
const MAX_QUICK_FILTERS = 6;
const BANNED_PHRASES = ["seeded sample"];
const BANNED_TOKENS = new Set(["seeded", "sample"]);
const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "feel",
  "feels",
  "felt",
  "for",
  "from",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "hers",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "like",
  "me",
  "more",
  "my",
  "myself",
  "no",
  "not",
  "of",
  "off",
  "on",
  "once",
  "or",
  "our",
  "out",
  "over",
  "really",
  "s",
  "she",
  "so",
  "some",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "up",
  "us",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "without",
  "you",
  "your",
]);

const normalizeText = (value: string | null | undefined) => String(value || "").toLowerCase();
const normalizeSearchText = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const joinEntryText = (entry: { title?: string; summary?: string; body?: string; tags?: string[]; themes?: string[]; triggers?: string[] }) =>
  [
    entry.title,
    entry.summary,
    entry.body,
    ...(entry.tags || []),
    ...(entry.themes || []),
    ...(entry.triggers || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const tokenize = (text: string) => (text.match(/[a-z][a-z']{2,}/g) || []);

const formatFilterLabel = (value: string) =>
  value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());

type CategoryRule = {
  label: string;
  keywords?: string[];
  tags?: string[];
  evidenceLabels?: string[];
  emotionLabels?: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    label: "Work",
    keywords: ["work", "job", "boss", "manager", "office", "shift", "deadline", "meeting", "client", "project", "coworker", "career"],
    tags: ["work", "job", "career"],
    evidenceLabels: ["IMPACT_WORK"],
  },
  {
    label: "Relationships",
    keywords: ["relationship", "relationships", "family", "partner", "spouse", "friend", "friends", "dating"],
    tags: ["relationships", "relationship", "family", "partner", "friends"],
    evidenceLabels: ["IMPACT_SOCIAL"],
  },
  {
    label: "Self-care",
    keywords: ["self care", "self-care", "hygiene", "shower", "sleep", "rest", "eat", "eating", "meal", "exercise", "walk", "run", "gym"],
    tags: ["self care", "self-care", "health", "exercise", "rest"],
    evidenceLabels: ["IMPACT_SELF_CARE"],
  },
  {
    label: "Anxiety",
    keywords: ["anxiety", "anxious", "worry", "worried", "panic", "overwhelmed", "stressed", "stress", "nervous"],
    emotionLabels: ["anxiety", "anxious", "worry", "panic"],
    evidenceLabels: ["SYMPTOM_ANXIETY"],
  },
  {
    label: "Mood",
    keywords: ["sad", "down", "depressed", "low mood", "empty", "numb", "tearful"],
    evidenceLabels: ["SYMPTOM_MOOD"],
  },
  {
    label: "Sleep",
    keywords: ["sleep", "insomnia", "night", "nightmares", "restless"],
    evidenceLabels: ["SYMPTOM_SLEEP"],
  },
  {
    label: "Energy",
    keywords: ["energy", "fatigue", "tired", "exhausted", "drained"],
    evidenceLabels: ["SYMPTOM_SOMATIC"],
  },
  {
    label: "Motivation",
    keywords: ["motivation", "motivated", "drive", "focus", "focused", "procrastinate", "avoid", "interest", "interestless"],
    evidenceLabels: ["SYMPTOM_ANHEDONIA", "SYMPTOM_COGNITIVE"],
  },
  {
    label: "Therapy",
    keywords: ["therapy", "therapist", "session", "counseling", "counsellor"],
    tags: ["therapy"],
  },
  {
    label: "Safety",
    keywords: ["unsafe", "harm", "self harm", "self-harm", "suicidal", "suicide"],
    evidenceLabels: ["SYMPTOM_RISK"],
  },
  {
    label: "Stressors",
    keywords: ["stressor", "stressors", "grief", "loss", "breakup", "conflict"],
    evidenceLabels: ["CONTEXT_STRESSOR"],
  },
  {
    label: "Health",
    keywords: ["pain", "sick", "ill", "health", "medical", "doctor", "hospital"],
    evidenceLabels: ["CONTEXT_MEDICAL"],
  },
  {
    label: "Substances",
    keywords: ["alcohol", "drinking", "weed", "cannabis", "drug", "meds", "medication", "substance"],
    evidenceLabels: ["CONTEXT_SUBSTANCE"],
  },
];

const normalizeRuleList = (values?: string[]) =>
  (values || [])
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);

const NORMALIZED_CATEGORY_RULES = CATEGORY_RULES.map((rule) => ({
  ...rule,
  keywords: normalizeRuleList(rule.keywords),
  tags: normalizeRuleList(rule.tags),
  evidenceLabels: normalizeRuleList(rule.evidenceLabels),
  emotionLabels: normalizeRuleList(rule.emotionLabels),
  normalizedLabel: normalizeSearchText(rule.label),
}));

const CATEGORY_RULE_LOOKUP = new Map(
  NORMALIZED_CATEGORY_RULES.map((rule) => [rule.normalizedLabel, rule]),
);

const isBannedLabel = (value: string) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) return true;
  if (BANNED_PHRASES.some((phrase) => normalized.includes(normalizeSearchText(phrase)))) return true;
  const tokens = normalized.split(" ");
  return tokens.some((token) => BANNED_TOKENS.has(token));
};

const entryMatchesCategoryRule = (
  entry: Parameters<typeof joinEntryText>[0] & { emotions?: { label: string; tone: string }[]; evidenceUnits?: { label: string }[] },
  rule: (typeof NORMALIZED_CATEGORY_RULES)[number],
) => {
  const entryText = normalizeSearchText(joinEntryText(entry));
  const tagText = normalizeSearchText((entry.tags || []).join(" "));
  const emotionText = normalizeSearchText((entry.emotions || []).map((emotion) => emotion.label).join(" "));
  const evidenceLabels = new Set(
    (entry.evidenceUnits || []).map((unit) => normalizeSearchText(unit.label)),
  );

  const matchesKeyword = (keyword: string) =>
    (!!keyword && entryText.includes(keyword)) ||
    (!!keyword && tagText.includes(keyword)) ||
    (!!keyword && emotionText.includes(keyword));

  return (
    (rule.keywords || []).some(matchesKeyword) ||
    (rule.tags || []).some((tag) => tagText.includes(tag)) ||
    (rule.emotionLabels || []).some((label) => emotionText.includes(label)) ||
    (rule.evidenceLabels || []).some((label) => evidenceLabels.has(label))
  );
};

const buildQuickFilters = (
  entries: Array<{ title?: string; summary?: string; body?: string; tags?: string[]; emotions?: { label: string }[]; evidenceUnits?: { label: string }[] }>,
) => {
  if (!entries.length) return [QUICK_FILTER_DEFAULT];

  const categoryCounts = new Map<string, number>();
  entries.forEach((entry) => {
    NORMALIZED_CATEGORY_RULES.forEach((rule) => {
      if (entryMatchesCategoryRule(entry, rule)) {
        categoryCounts.set(rule.label, (categoryCounts.get(rule.label) || 0) + 1);
      }
    });
  });

  const ruleLabels = NORMALIZED_CATEGORY_RULES
    .filter((rule) => (categoryCounts.get(rule.label) || 0) > 0)
    .sort((a, b) => (categoryCounts.get(b.label) || 0) - (categoryCounts.get(a.label) || 0))
    .map((rule) => rule.label);

  const selectedLabels = new Set(ruleLabels.map((label) => normalizeSearchText(label)));
  const tagLabels: string[] = [];

  if (ruleLabels.length < MAX_QUICK_FILTERS) {
    const tagCounts = new Map<string, number>();
    entries.forEach((entry) => {
      (entry.tags || []).forEach((tag) => {
        const normalized = normalizeSearchText(tag);
        if (!normalized) return;
        if (isBannedLabel(normalized)) return;
        const tokens = normalized.split(" ");
        if (tokens.every((token) => STOPWORDS.has(token))) return;
        tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
      });
    });

    const tagCandidates = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .filter((tag) => !selectedLabels.has(tag));

    tagCandidates.forEach((tag) => {
      if (ruleLabels.length + tagLabels.length >= MAX_QUICK_FILTERS) return;
      tagLabels.push(formatFilterLabel(tag));
      selectedLabels.add(tag);
    });
  }

  return [
    QUICK_FILTER_DEFAULT,
    ...[...ruleLabels, ...tagLabels].slice(0, MAX_QUICK_FILTERS),
  ];
};

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const entryMatchesQuickFilter = (entry: Parameters<typeof joinEntryText>[0] & { emotions?: { label: string; tone: string }[]; evidenceUnits?: { label: string }[] }, filter: string) => {
  const normalizedFilter = normalizeSearchText(filter);
  if (!normalizedFilter || normalizedFilter === normalizeText(QUICK_FILTER_DEFAULT)) return true;
  if (isBannedLabel(normalizedFilter)) return false;

  const categoryRule = CATEGORY_RULE_LOOKUP.get(normalizedFilter);
  if (categoryRule) return entryMatchesCategoryRule(entry, categoryRule);

  const entryText = normalizeSearchText(joinEntryText(entry));
  const emotionLabels = (entry.emotions || []).map((emotion) => normalizeText(emotion.label));

  return (
    includesAny(entryText, [normalizedFilter]) ||
    emotionLabels.some((label) => label.includes(normalizedFilter))
  );
};

const JournalDashboard = () => {
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [selectedLimit, setSelectedLimit] = useState<number | null>(null);
  const [autoLimit, setAutoLimit] = useState(5);
  const [activeFilter, setActiveFilter] = useState(QUICK_FILTER_DEFAULT);
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
  const quickFilters = useMemo(() => buildQuickFilters(recentEntries), [recentEntries]);
  const filteredEntries = useMemo(
    () => recentEntries.filter((entry) => entryMatchesQuickFilter(entry, activeFilter)),
    [recentEntries, activeFilter],
  );
  const filterEmpty = !recentLoading && !recentError && filteredEntries.length === 0 && !recentEmpty;

  useEffect(() => {
    if (!quickFilters.includes(activeFilter)) {
      setActiveFilter(QUICK_FILTER_DEFAULT);
    }
  }, [activeFilter, quickFilters]);

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
          <Card className="mt-6 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-brandLight">Recent signals</p>
            <div className="mt-3">
              {entriesLoading ? (
                <div className="h-10 rounded-full bg-brand/10" />
              ) : entries[0]?.evidenceUnits?.length ? (
                <SignalChips evidenceUnits={entries[0].evidenceUnits} />
              ) : (
                <p className="text-sm text-slate-500">Add an entry to see signal chips here.</p>
              )}
            </div>
          </Card>
        </div>
      </PageHeader>
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-slate-900">Quick filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveFilter(QUICK_FILTER_DEFAULT)}
            disabled={activeFilter === QUICK_FILTER_DEFAULT}
          >
            Reset
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickFilters.map((filter) => (
            <Button
              key={filter}
              variant={filter === activeFilter ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </Card>
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
          ) : filterEmpty ? (
            <Card className="p-6 text-slate-700">
              <h3 className="text-lg font-semibold text-slate-800">No entries match this filter</h3>
              <p className="mt-1 text-sm text-slate-600">Try another filter or reset to see everything.</p>
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
              {filteredEntries.map((entry) => (
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
