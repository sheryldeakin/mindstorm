import clsx from "clsx";
import type { CaseEntry, EvidenceUnit } from "../../types/clinician";

const CLUSTERS = [
  { id: "mood", label: "Mood/Anhedonia", labels: ["SYMPTOM_MOOD"] },
  { id: "cognitive", label: "Cognitive", labels: ["SYMPTOM_COGNITIVE"] },
  { id: "somatic", label: "Somatic", labels: ["SYMPTOM_SOMATIC"] },
  { id: "sleep", label: "Sleep", labels: ["SYMPTOM_SLEEP"] },
  { id: "risk", label: "Risk", labels: ["SYMPTOM_RISK"] },
  { id: "anxiety", label: "Anxiety", labels: ["SYMPTOM_ANXIETY"] },
  { id: "psychosis", label: "Psychosis", labels: ["SYMPTOM_PSYCHOSIS"] },
];

const getIntensity = (units: EvidenceUnit[]) => {
  const present = units.filter((unit) => unit.attributes?.polarity === "PRESENT");
  if (!present.length) return 0;
  return Math.min(3, present.length);
};

const getCellClass = (hasEntry: boolean, intensity: number) => {
  if (!hasEntry) return "bg-slate-200";
  if (intensity === 0) return "bg-white";
  if (intensity === 1) return "bg-orange-200";
  if (intensity === 2) return "bg-orange-400";
  return "bg-red-500";
};

type SymptomHeatmapProps = {
  entries: CaseEntry[];
  groupByWeek?: boolean;
  highlightLabels?: string[];
  lastAccessISO?: string | null;
};

const SymptomHeatmap = ({
  entries,
  groupByWeek = false,
  highlightLabels = [],
  lastAccessISO,
}: SymptomHeatmapProps) => {
  if (!entries.length) {
    return <p className="text-sm text-slate-500">No entry data available.</p>;
  }

  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const buckets: { key: string; entries: CaseEntry[] }[] = [];

  if (groupByWeek) {
    sorted.forEach((entry) => {
      const key = entry.dateISO.slice(0, 7);
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) {
        bucket.entries.push(entry);
      } else {
        buckets.push({ key, entries: [entry] });
      }
    });
  } else {
    sorted.forEach((entry) => {
      buckets.push({ key: entry.dateISO, entries: [entry] });
    });
  }

  const getContextTags = (bucketEntries: CaseEntry[]) => {
    const tags = new Set<string>();
    bucketEntries.forEach((entry) => {
      if (entry.context_tags?.length) {
        entry.context_tags.forEach((tag) => tags.add(tag.toLowerCase()));
        return;
      }
      (entry.evidenceUnits || []).forEach((unit) => {
        if (unit.label.startsWith("CONTEXT_")) {
          tags.add(unit.label.replace(/_/g, " ").toLowerCase());
        }
      });
    });
    return Array.from(tags).filter((tag) => /(medical|substance)/i.test(tag));
  };

  const contextColumns = new Set(
    buckets
      .filter((bucket) => getContextTags(bucket.entries).length > 0)
      .map((bucket) => bucket.key),
  );
  const contextByBucket = new Map(
    buckets.map((bucket) => [bucket.key, getContextTags(bucket.entries)]),
  );
  const lastAccessDate = lastAccessISO ? new Date(lastAccessISO) : null;
  const isNewBucket = (key: string) => {
    if (!lastAccessDate) return false;
    const bucketDate = new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00Z`);
    return bucketDate > lastAccessDate;
  };

  return (
    <div className="overflow-auto">
      <div className="min-w-[720px]">
        <div className="mb-2 grid grid-cols-[180px_repeat(auto-fit,minmax(24px,1fr))] gap-2 text-xs text-slate-400">
          <span />
          {buckets.map((bucket) => {
            const contextTags = getContextTags(bucket.entries);
            const hasContext = contextColumns.has(bucket.key);
            const hasMedical = contextTags.some((tag) => /medical/i.test(tag));
            const hasSubstance = contextTags.some((tag) => /substance/i.test(tag));
            const isNew = isNewBucket(bucket.key);
            return (
              <span
                key={bucket.key}
                className={clsx(
                  "relative flex flex-col items-center gap-1 text-center",
                  hasContext && "text-indigo-500",
                )}
              >
                {contextTags.length > 0 ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400 cursor-help"
                    title={contextTags.join(", ")}
                    aria-label={contextTags.join(", ")}
                  />
                ) : (
                  <span className="h-1.5 w-1.5" />
                )}
                {isNew ? <span className="h-1 w-6 rounded-full bg-sky-400" /> : null}
                {hasContext ? (
                  <span className="text-[9px] uppercase text-indigo-500">
                    {hasMedical ? "Med" : hasSubstance ? "Sub" : "Ctx"}
                  </span>
                ) : null}
                <span>{bucket.key}</span>
              </span>
            );
          })}
        </div>
        <div className="space-y-2">
          {CLUSTERS.map((cluster) => (
            <div
              key={cluster.id}
              className="grid grid-cols-[180px_repeat(auto-fit,minmax(24px,1fr))] items-center gap-2"
            >
              <span
                className={clsx(
                  "text-xs font-semibold text-slate-600",
                  highlightLabels.some((label) => cluster.labels.includes(label)) &&
                    "rounded-full bg-indigo-50 px-2 py-1 text-indigo-600",
                )}
              >
                {cluster.label}
              </span>
              {buckets.map((bucket) => {
                const units = bucket.entries.flatMap((entry) =>
                  (entry.evidenceUnits || []).filter((unit) => cluster.labels.includes(unit.label)),
                );
                const hasEntry = bucket.entries.length > 0;
                const intensity = getIntensity(units);
                const contextTags = contextByBucket.get(bucket.key) || [];
                const isNew = isNewBucket(bucket.key);
                return (
                  <span
                    key={`${cluster.id}-${bucket.key}`}
                    className={clsx(
                      "h-5 w-full rounded-sm border border-slate-200",
                      getCellClass(hasEntry, intensity),
                      isNew && "ring-2 ring-sky-300 ring-offset-1",
                    )}
                    title={contextTags.length ? contextTags.join(", ") : undefined}
                    aria-label={contextTags.length ? contextTags.join(", ") : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-slate-200" /> Missing entry
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-white border border-slate-200" /> No mention
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-orange-200" /> Mild
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-orange-400" /> Moderate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-red-500" /> High
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-indigo-400" /> Context event
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-sky-400" /> New since last review
          </span>
        </div>
      </div>
    </div>
  );
};

export default SymptomHeatmap;
