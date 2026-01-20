import { useEffect, useState } from "react";
import ShareViaPortalToggle from "../components/features/ShareViaPortalToggle";
import TimeRangeSelector from "../components/features/TimeRangeSelector";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import Textarea from "../components/ui/Textarea";
import { apiFetch } from "../lib/apiClient";
import type { AuditLogEntry, ClinicianAppendix, PrepareSummary, WeeklySummary } from "../types/prepare";
import PageHeader from "../components/layout/PageHeader";
import { usePatientTranslation } from "../hooks/usePatientTranslation";

const timeRanges = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
];

const rangeToDays = (rangeId: string) => {
  if (rangeId === "7") return 7;
  if (rangeId === "30") return 56;
  return 84;
};

const auditLog: AuditLogEntry[] = [
  { id: "log-1", action: "PDF exported", timestamp: "Today · 9:42 AM" },
  { id: "log-2", action: "Portal share enabled", timestamp: "Yesterday · 6:10 PM" },
];

const PreparePage = () => {
  const [timeRange, setTimeRange] = useState("30");
  const [summary, setSummary] = useState<PrepareSummary | null>(null);
  const [appendix, setAppendix] = useState<ClinicianAppendix | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryJobId, setSummaryJobId] = useState<string | null>(null);
  const [summaryProgress, setSummaryProgress] = useState<{
    percent: number;
    stage: string;
    detail?: { current?: number; total?: number };
  }>({ percent: 0, stage: "queued" });
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [redactedItems, setRedactedItems] = useState<string[]>([]);
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [includeAppendix, setIncludeAppendix] = useState(false);
  const [whySharing, setWhySharing] = useState("");
  const [impactNote, setImpactNote] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({});
  const [whySharingTouched, setWhySharingTouched] = useState(false);
  const [impactNoteTouched, setImpactNoteTouched] = useState(false);
  const [additionalNotesTouched, setAdditionalNotesTouched] = useState(false);
  const { getPatientLabel } = usePatientTranslation();

  const buildRedactionKey = (section: string, text: string) => `${section}::${text}`;
  const isVisible = (section: string, text: string) =>
    !redactedItems.includes(buildRedactionKey(section, text));
  const toggleRedaction = (section: string, text: string) => {
    const key = buildRedactionKey(section, text);
    setRedactedItems((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const getEvidenceForBullet = (
    sectionKey: keyof PrepareSummary["evidenceBySection"],
    bullet: string,
  ) => {
    const sectionEvidence = summary?.evidenceBySection?.[sectionKey] || [];
    const match = sectionEvidence.find(
      (item) => normalizeText(item.bullet) === normalizeText(bullet),
    );
    return match?.quotes || [];
  };

  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    setSummaryError(null);
    setSummary(null);
    setAppendix(null);
    setSummaryJobId(null);
    setSummaryProgress({ percent: 0, stage: "queued" });
    apiFetch<{ jobId: string }>("/ai/prepare-summary", {
      method: "POST",
      body: JSON.stringify({ rangeDays: rangeToDays(timeRange) }),
    })
      .then(({ jobId }) => {
        if (!active) return;
        setSummaryJobId(jobId);
      })
      .catch((err) => {
        if (!active) return;
        setSummaryError(err instanceof Error ? err.message : "Failed to build summary.");
        setSummaryLoading(false);
        setSummary(null);
        setAppendix(null);
      });
    return () => {
      active = false;
    };
  }, [timeRange]);

  useEffect(() => {
    if (!summaryJobId) return undefined;
    let active = true;

    const formatStage = (stage: string, detail?: { current?: number; total?: number }) => {
      if (detail?.total && (stage === "backfilling_weekly_summaries" || stage === "merging_summaries")) {
        const current = Math.min(detail.current || 0, detail.total);
        return `Processing Week ${Math.max(1, current)} of ${detail.total}...`;
      }
      switch (stage) {
        case "fetching_entries":
          return "Collecting journal entries";
        case "loading_weekly_summaries":
          return "Loading weekly summaries";
        case "backfilling_weekly_summaries":
          return "Generating missing weekly summaries";
        case "loading_signals":
          return "Reading detected signals";
        case "merging_summaries":
          return "Merging summaries";
        case "finalizing":
          return "Finalizing summary";
        case "completed":
          return "Complete";
        default:
          return "Preparing summary";
      }
    };

    const poll = async () => {
      try {
        const response = await apiFetch<{
          status: string;
          stage?: string;
          percent?: number;
          result?: { summary: PrepareSummary; appendix?: ClinicianAppendix };
          error?: string;
          detail?: { current?: number; total?: number };
        }>(`/ai/prepare-summary/${summaryJobId}`);

        if (!active) return;
        const percent = typeof response.percent === "number" ? response.percent : 0;
        const stage = response.stage || "queued";
        const detail = response.detail;
        setSummaryProgress({ percent, stage: formatStage(stage, detail), detail });

        if (response.status === "completed") {
          setSummary(response.result?.summary || null);
          setAppendix(response.result?.appendix || null);
          setWhySharingTouched(false);
          setImpactNoteTouched(false);
          setSummaryLoading(false);
          setSummaryJobId(null);
        }

        if (response.status === "failed") {
          setSummaryError(response.error || "Failed to build summary.");
          setSummaryLoading(false);
          setSummaryJobId(null);
        }
      } catch (err) {
        if (!active) return;
        setSummaryError(err instanceof Error ? err.message : "Failed to build summary.");
        setSummaryLoading(false);
        setSummaryJobId(null);
      }
    };

    poll();
    const interval = setInterval(poll, 1200);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [summaryJobId]);

  useEffect(() => {
    setWeeklyLoading(true);
    setWeeklyError(null);
    apiFetch<{ weeklySummaries: WeeklySummary[] }>(
      `/derived/weekly-summaries?rangeDays=${rangeToDays(timeRange)}`,
    )
      .then(({ weeklySummaries: responseSummaries }) => {
        setWeeklySummaries(responseSummaries || []);
      })
      .catch((err) => {
        setWeeklyError(err instanceof Error ? err.message : "Failed to load weekly summaries.");
        setWeeklySummaries([]);
      })
      .finally(() => {
        setWeeklyLoading(false);
      });
  }, [timeRange]);

  useEffect(() => {
    if (!summary || summaryLoading) return;
    if (!whySharingTouched) setWhySharing(summary.whySharing || "");
    if (!impactNoteTouched) setImpactNote(summary.impactNote || "");
    if (!additionalNotesTouched) setAdditionalNotes("");
  }, [additionalNotesTouched, impactNoteTouched, summary, summaryLoading, whySharingTouched]);

  const listItems = (items: string[] | undefined) =>
    (items || []).map((text, index) => ({ id: `${index}-${text}`, text }));

  const renderInfluenceLabel = (value: string) => {
    const trimmed = value.trim();
    const looksClinical = /^[A-Z0-9_]+$/.test(trimmed) || trimmed.startsWith("CONTEXT_");
    return looksClinical ? getPatientLabel(trimmed) : value;
  };

  const unclearItems = (() => {
    const items = new Set<string>(summary?.unclearAreas || []);
    if (appendix?.missingGates?.duration) {
      items.add("When exactly this started (whether it is new or longstanding).");
    }
    if (appendix?.missingGates?.impairment) {
      items.add("The specific impact on my daily routine (work, school, or self-care).");
    }
    if (appendix?.highUncertaintyEvidence?.length) {
      items.add("Experiences I've described as uncertain or hard to pinpoint.");
    }
    return Array.from(items);
  })();

  const renderInlineEvidence = (sectionKey: string, bullet: string) => {
    if (!includeEvidence) return null;
    const quotes = getEvidenceForBullet(sectionKey as keyof PrepareSummary["evidenceBySection"], bullet).filter(
      (quote) => isVisible(`${sectionKey}-quote`, quote),
    );
    if (!quotes.length) return null;

    return (
      <div className="mt-2 space-y-2 border-l-2 border-slate-200/80 pl-4 text-xs text-slate-500">
        {quotes.map((quote) => (
          <div key={quote} className="flex items-start justify-between gap-3 rounded-2xl px-3 py-2">
            <span>“{quote}”</span>
            <button
              type="button"
              onClick={() => toggleRedaction(`${sectionKey}-quote`, quote)}
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
            >
              Hide
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderAdditionalNotes = (sectionKey: string, placeholder: string) => (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Additional notes</p>
      <Textarea
        rows={2}
        className="mt-2 text-sm"
        value={sectionNotes[sectionKey] || ""}
        onChange={(event) =>
          setSectionNotes((prev) => ({
            ...prev,
            [sectionKey]: event.target.value,
          }))
        }
        placeholder={placeholder}
      />
    </div>
  );

  const renderWeeklyList = () => {
    if (weeklyLoading) {
      return <p className="text-sm text-slate-500">Loading weekly summaries...</p>;
    }
    if (weeklyError) {
      return <p className="text-sm text-rose-600">{weeklyError}</p>;
    }
    if (!weeklySummaries.length) {
      return <p className="text-sm text-slate-500">No weekly summaries available yet.</p>;
    }

    return (
      <div className="ms-glass-surface mt-4 divide-y divide-slate-200/70 rounded-2xl border">
        {weeklySummaries.map((week) => (
          <div key={week.weekStartISO} className="p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Week of {week.weekStartISO} - {week.weekEndISO}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {week.summary?.overTimeSummary || "No weekly summary generated for this week yet."}
            </p>
            <div className="mt-3 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recurring experiences</p>
                <ul className="mt-2 space-y-1">
                  {(week.summary?.recurringExperiences?.length
                    ? week.summary.recurringExperiences
                    : ["No themes captured."])
                    .slice(0, 4)
                    .map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Questions to explore</p>
                <ul className="mt-2 space-y-1">
                  {(week.summary?.questionsToExplore?.length
                    ? week.summary.questionsToExplore
                    : ["No questions generated."])
                    .slice(0, 3)
                    .map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="prepare" />
      {summaryLoading && (
        <div className="rounded-2xl border border-slate-200 p-4 text-xs text-slate-500" role="status" aria-live="polite">
          <div className="flex items-center justify-between">
            <span>{summaryProgress.stage}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              {Math.min(99, Math.max(1, Math.round(summaryProgress.percent || 1)))}%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100" aria-hidden>
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(2, summaryProgress.percent || 2))}%` }}
            />
          </div>
        </div>
      )}
      {summaryError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {summaryError}
        </div>
      )}
      <section className="space-y-6">
        <Card className="p-0">
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">This is a personal reflection summary</h3>
            <p className="mt-3 text-sm text-slate-600">
              This is a personal reflection summary generated from my journal entries. It is not a
              diagnosis or medical opinion. It is meant to support conversation and shared understanding.
            </p>
            {!summaryLoading && !summary && !summaryError && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Summary not generated yet. Connect a model or try again to populate this document.
              </div>
            )}
            <div className="mt-4 grid gap-3 text-sm text-slate-500 sm:grid-cols-3">
              <div className="ms-glass-surface rounded-2xl border p-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Time range</p>
                <p className="mt-1 text-sm text-slate-700">
                  {summary?.timeRangeLabel ||
                    (timeRange === "7" ? "Last 7 days" : timeRange === "30" ? "Last 8 weeks" : "Last 12 weeks")}
                </p>
              </div>
              <div className="ms-glass-surface rounded-2xl border p-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Data source</p>
                <p className="mt-1 text-sm text-slate-700">Personal journal entries</p>
              </div>
              <div className="ms-glass-surface rounded-2xl border p-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Confidence</p>
                <p className="mt-1 text-sm text-slate-700">
                  {summary?.confidenceNote || "Based on patterns in written reflections"}
                </p>
              </div>
            </div>
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Why I'm bringing this</h3>
            <p className="mt-2 text-sm text-slate-500">Editable, in your own words.</p>
            <Textarea
              rows={4}
              className="mt-4 text-sm"
              value={whySharing}
              onChange={(event) => {
                setWhySharing(event.target.value);
                setWhySharingTouched(true);
              }}
            />
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Recurring Experiences</h3>
            <p className="mt-1 text-sm text-slate-500">Themes that appear often in my writing.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {summaryLoading ? (
                <li className="text-sm text-slate-500">Summarizing themes from your entries...</li>
              ) : listItems(summary?.recurringExperiences).filter((item) => isVisible("recurring", item.text)).length ? (
                listItems(summary?.recurringExperiences)
                  .filter((item) => isVisible("recurring", item.text))
                  .map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <div>
                          <span>{item.text}</span>
                          {renderInlineEvidence("recurringExperiences", item.text)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRedaction("recurring", item.text)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600"
                      >
                        Hide
                      </button>
                    </li>
                  ))
              ) : (
                <li className="text-sm text-slate-500">Add more entries to surface recurring experiences.</li>
              )}
            </ul>
            {renderAdditionalNotes("recurringExperiences", "Anything you'd like to add about these experiences.")}
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">How this feels over time</h3>
            <p className="mt-2 text-sm text-slate-500">
              {summaryLoading
                ? "Summarizing how this shifts over time..."
                : summary?.overTimeSummary ||
                  "These experiences feel more noticeable lately. Some days are manageable, others feel heavier."}
            </p>
            <div className="ms-glass-surface mt-4 rounded-2xl border p-4 font-mono text-xs text-slate-500">
              <p>Intensity over time:</p>
              {(summary?.intensityLines?.length ? summary.intensityLines : ["Jan ..", "Feb ...", "Mar ...."]).map(
                (line, index) => (
                  <p key={line} className={index === 0 ? "mt-2" : undefined}>
                    {line}
                  </p>
                ),
              )}
            </div>
            {renderAdditionalNotes("overTimeSummary", "Any timing or patterns you'd like to call out.")}
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Weekly summaries</h3>
            <p className="mt-1 text-sm text-slate-500">Week-by-week reflections from your entries.</p>
            {renderWeeklyList()}
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Where this affects my life</h3>
            <p className="mt-1 text-sm text-slate-500">Areas of life that feel affected.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {summaryLoading ? (
                <li className="text-sm text-slate-500">Mapping where this shows up in daily life...</li>
              ) : listItems(summary?.impactAreas).filter((item) => isVisible("impact", item.text)).length ? (
                listItems(summary?.impactAreas)
                  .filter((item) => isVisible("impact", item.text))
                  .map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <div>
                          <span>{item.text}</span>
                          {renderInlineEvidence("impactAreas", item.text)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRedaction("impact", item.text)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600"
                      >
                        Hide
                      </button>
                    </li>
                  ))
              ) : (
                <li className="text-sm text-slate-500">Add entries to highlight impact areas.</li>
              )}
            </ul>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Additional notes</p>
              <Textarea
                rows={2}
                className="mt-2 text-sm"
                value={impactNote}
                onChange={(event) => {
                  setImpactNote(event.target.value);
                  setImpactNoteTouched(true);
                }}
              />
            </div>
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Things that seem connected</h3>
            <p className="mt-1 text-sm text-slate-500">Observed relationships, not causation.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {summaryLoading ? (
                <li className="text-sm text-slate-500">Identifying related influences...</li>
              ) : listItems(summary?.relatedInfluences).filter((item) => isVisible("influences", item.text)).length ? (
                listItems(summary?.relatedInfluences)
                  .filter((item) => isVisible("influences", item.text))
                  .map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <div>
                          <span>{renderInfluenceLabel(item.text)}</span>
                          {renderInlineEvidence("relatedInfluences", item.text)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRedaction("influences", item.text)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600"
                      >
                        Hide
                      </button>
                    </li>
                  ))
              ) : (
                <li className="text-sm text-slate-500">Add entries to surface related influences.</li>
              )}
            </ul>
            {renderAdditionalNotes("relatedInfluences", "Add any context about things that feel connected.")}
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Areas I’m not sure about</h3>
            <p className="mt-1 text-sm text-slate-500">Areas I'm not sure about yet.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {summaryLoading ? (
                <li className="text-sm text-slate-500">Capturing uncertainties to discuss...</li>
              ) : listItems(unclearItems).filter((item) => isVisible("unclear", item.text)).length ? (
                listItems(unclearItems)
                  .filter((item) => isVisible("unclear", item.text))
                  .map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <div>
                          <span>{item.text}</span>
                          {renderInlineEvidence("unclearAreas", item.text)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRedaction("unclear", item.text)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600"
                      >
                        Hide
                      </button>
                    </li>
                  ))
              ) : (
                <li className="text-sm text-slate-500">No uncertainties captured yet.</li>
              )}
            </ul>
            {renderAdditionalNotes("unclearAreas", "Add any uncertainties you want to explore.")}
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Questions I'd like help exploring</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {summaryLoading ? (
                <li className="text-sm text-slate-500">Drafting questions to explore...</li>
              ) : listItems(summary?.questionsToExplore).filter((item) => isVisible("questions", item.text)).length ? (
                listItems(summary?.questionsToExplore)
                  .filter((item) => isVisible("questions", item.text))
                  .map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <div>
                          <span>{item.text}</span>
                          {renderInlineEvidence("questionsToExplore", item.text)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRedaction("questions", item.text)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-600"
                      >
                        Hide
                      </button>
                    </li>
                  ))
              ) : (
                <li className="text-sm text-slate-500">Add entries to surface questions.</li>
              )}
            </ul>
            {renderAdditionalNotes("questionsToExplore", "Add any questions you want to bring to your clinician.")}
          </div>
          <div className="border-b border-slate-200/70 p-6">
            <h3 className="text-xl font-semibold">Additional notes</h3>
            <p className="mt-2 text-sm text-slate-500">Any extra context you want your clinician to know.</p>
            <Textarea
              rows={3}
              className="mt-4 text-sm"
              value={additionalNotes}
              onChange={(event) => {
                setAdditionalNotes(event.target.value);
                setAdditionalNotesTouched(true);
              }}
              placeholder="Add any context, details, or questions you didn't see above."
            />
          </div>
          <div className="p-6 text-sm text-slate-600">
            This summary reflects personal experiences as described in writing. It does not make diagnoses
            or treatment recommendations. Clinical interpretation is left to a qualified professional.
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Evidence snippets</h3>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(event) => setIncludeEvidence(event.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              Include
            </label>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Optional quotes from my journal entries. Only included if I opt in.
          </p>
          {includeEvidence ? (
            <p className="mt-3 text-sm text-slate-500">
              Evidence snippets appear within each section when available.
            </p>
          ) : null}
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Export controls</h3>
          <p className="mt-1 text-sm text-slate-500">Choose time range, redactions, and formats.</p>
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">Time range</p>
            <div className="mt-3">
              <TimeRangeSelector
                options={timeRanges}
                activeId={timeRange}
                onChange={setTimeRange}
              />
            </div>
          </div>
          <div className="ms-glass-surface mt-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm text-slate-600">
            <span>Hidden items</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{redactedItems.length} hidden</span>
              {redactedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRedactedItems([])}
                  className="text-xs font-semibold text-brand hover:text-brandLight"
                >
                  Restore all
                </button>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Hidden items</h3>
          <p className="mt-1 text-sm text-slate-500">Restore anything you hid from the summary.</p>
          {redactedItems.length ? (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {redactedItems.map((item) => (
                <div
                  key={item}
                  className="ms-glass-surface flex items-center justify-between rounded-2xl border px-4 py-3"
                >
                  <span className="line-through text-slate-400">{item.split("::").slice(1).join("::")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const [sectionKey, ...rest] = item.split("::");
                      toggleRedaction(sectionKey, rest.join("::"));
                    }}
                    className="text-xs font-semibold text-brand hover:text-brandLight"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No hidden items.</p>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Share options</h3>
          <p className="mt-1 text-sm text-slate-500">PDF, mobile share link, or portal share.</p>
          <div className="mt-4 space-y-4">
            <ShareViaPortalToggle
              enabled={portalEnabled}
              consentGiven={consentGiven}
              onToggleEnabled={setPortalEnabled}
              onToggleConsent={setConsentGiven}
            />
            <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>Include clinician-facing appendix</span>
              <input
                type="checkbox"
                checked={includeAppendix}
                onChange={(event) => setIncludeAppendix(event.target.checked)}
                className="h-4 w-4 accent-brand"
              />
            </label>
            {portalEnabled && includeAppendix ? (
              <p className="text-xs text-slate-500">
                The clinician appendix will be included when sharing via portal.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary">Download PDF</Button>
              <Button variant="secondary">Share link</Button>
              <Button variant="secondary">One-page condensed</Button>
              <Button disabled={!portalEnabled || !consentGiven}>Share via portal</Button>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Audit log</h3>
          <p className="mt-1 text-sm text-slate-500">What was shared and when.</p>
          <div className="mt-4 space-y-3">
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                className="ms-glass-surface flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{entry.action}</span>
                <span className="text-xs text-slate-400">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
};

export default PreparePage;
