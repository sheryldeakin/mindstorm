import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Battery, CloudRain, Moon, Sun, ChevronRight, Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import type { CheckInRecord } from "../types/checkIn";

type MetricConfig = {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  icon: typeof Battery;
  defaultValue: number;
};

const STEPS = ["Vitality", "Headspace", "Context"];

const VITALITY_METRICS: MetricConfig[] = [
  {
    id: "energy",
    label: "Physical energy",
    lowLabel: "Drained",
    highLabel: "Charged",
    icon: Battery,
    defaultValue: 60,
  },
  {
    id: "sleep",
    label: "Sleep quality",
    lowLabel: "Restless",
    highLabel: "Restorative",
    icon: Moon,
    defaultValue: 52,
  },
];

const HEADSPACE_METRICS: MetricConfig[] = [
  {
    id: "mood",
    label: "Overall mood",
    lowLabel: "Heavy",
    highLabel: "Light",
    icon: Sun,
    defaultValue: 55,
  },
  {
    id: "calm",
    label: "Mental calm",
    lowLabel: "Anxious",
    highLabel: "Peaceful",
    icon: CloudRain,
    defaultValue: 48,
  },
];

const CONTEXT_TAGS = [
  "Work pressure",
  "Social conflict",
  "Poor sleep",
  "Health flare",
  "Good news",
  "Exercise",
  "Therapy",
  "Medication change",
];

const buildDefaults = () =>
  [...VITALITY_METRICS, ...HEADSPACE_METRICS].reduce<Record<string, number>>((acc, metric) => {
    acc[metric.id] = metric.defaultValue;
    return acc;
  }, {});

const CheckInPage = () => {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [step, setStep] = useState(0);
  const [metrics, setMetrics] = useState<Record<string, number>>(buildDefaults);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [note, setNote] = useState("");
  const [addTagOpen, setAddTagOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingCheckIn, setExistingCheckIn] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const tagStorageKey = user?.id ? `check-in:custom-tags:${user.id}` : "check-in:custom-tags";

  const availableTags = useMemo(() => {
    const map = new Map<string, string>();
    [...CONTEXT_TAGS, ...customTags].forEach((tag) => {
      const key = tag.toLowerCase();
      if (!map.has(key)) map.set(key, tag);
    });
    return Array.from(map.values());
  }, [customTags]);

  const updateMetric = (id: string, value: number) => {
    setMetrics((prev) => ({ ...prev, [id]: value }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  useEffect(() => {
    if (status !== "authed") return;
    try {
      const raw = window.localStorage.getItem(tagStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomTags(parsed.filter((tag) => typeof tag === "string"));
        }
      }
    } catch {
      // Ignore storage errors.
    }
  }, [status, tagStorageKey]);

  useEffect(() => {
    if (status !== "authed") return;
    apiFetch<{ checkIn: CheckInRecord | null }>(`/check-ins/${todayISO}`)
      .then(({ checkIn }) => {
        if (!checkIn) return;
        setExistingCheckIn(true);
        if (Array.isArray(checkIn.metrics) && checkIn.metrics.length) {
          setMetrics((prev) => {
            const next = { ...prev };
            checkIn.metrics.forEach((metric) => {
              next[metric.id] = metric.value;
            });
            return next;
          });
        }
        if (Array.isArray(checkIn.tags)) {
          setSelectedTags(checkIn.tags);
          setCustomTags((prev) => {
            const existing = new Set(prev.map((tag) => tag.toLowerCase()));
            const next = [...prev];
            checkIn.tags.forEach((tag) => {
              const normalized = tag.toLowerCase();
              if (
                !existing.has(normalized) &&
                !CONTEXT_TAGS.some((base) => base.toLowerCase() === normalized)
              ) {
                existing.add(normalized);
                next.push(tag);
              }
            });
            return next;
          });
        }
        if (typeof checkIn.note === "string") {
          setNote(checkIn.note);
        }
      })
      .catch(() => {
        // Keep the check-in usable if the load fails.
      });
  }, [status, todayISO]);

  useEffect(() => {
    if (status !== "authed") return;
    try {
      window.localStorage.setItem(tagStorageKey, JSON.stringify(customTags));
    } catch {
      // Ignore storage errors.
    }
  }, [customTags, status, tagStorageKey]);

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    const alreadyExists =
      CONTEXT_TAGS.some((tag) => tag.toLowerCase() === normalized) ||
      customTags.some((tag) => tag.toLowerCase() === normalized);
    if (!alreadyExists) {
      setCustomTags((prev) => [...prev, trimmed]);
    }
    setSelectedTags((prev) =>
      prev.some((tag) => tag.toLowerCase() === normalized) ? prev : [...prev, trimmed],
    );
    setNewTag("");
    setAddTagOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const metricPayload = [...VITALITY_METRICS, ...HEADSPACE_METRICS].map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metrics[metric.id],
    }));
    try {
      await apiFetch("/check-ins", {
        method: "POST",
        body: JSON.stringify({
          dateISO: todayISO,
          metrics: metricPayload,
          tags: selectedTags,
          note,
        }),
      });
      setStep(3);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save check-in.");
    } finally {
      setSaving(false);
    }
  };

  const renderSlider = (metric: MetricConfig) => {
    const Icon = metric.icon;
    return (
      <div key={metric.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="rounded-full bg-slate-100 p-2 text-slate-500">
              <Icon size={16} />
            </span>
            {metric.label}
          </div>
          <span className="text-xs font-semibold text-slate-500">{metrics[metric.id]}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={metrics[metric.id]}
          onChange={(event) => updateMetric(metric.id, Number(event.target.value))}
          className="h-2 w-full cursor-pointer rounded-full bg-slate-200 accent-brand"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{metric.lowLabel}</span>
          <span>{metric.highLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-16 text-slate-900">
      <PageHeader
        pageId="check-in"
        title="Daily Pulse"
        description="A quick reflection to track your nervous system over time."
      />
      {existingCheckIn ? (
        <Card className="border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Today’s pulse is already saved. You can edit and re-save it anytime.
        </Card>
      ) : null}
      {saveError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {saveError}
        </Card>
      ) : null}

      {step < 3 ? (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="uppercase tracking-[0.3em]">Step {step + 1} of 3</span>
          <div className="flex items-center gap-2">
            {STEPS.map((label, index) => (
              <span
                key={label}
                className={
                  index === step
                    ? "rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                    : "rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-400"
                }
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[420px]">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="vitality"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="absolute inset-0"
            >
              <Card className="flex h-full flex-col gap-6 p-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">How is your body holding up?</h3>
                  <p className="text-sm text-slate-500">
                    Tune into your energy and rest in a few seconds.
                  </p>
                </div>
                <div className="space-y-6">{VITALITY_METRICS.map(renderSlider)}</div>
                <div className="mt-auto flex justify-end">
                  <Button onClick={() => setStep(1)} className="gap-2">
                    Next: Headspace <ChevronRight size={16} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : null}

          {step === 1 ? (
            <motion.div
              key="headspace"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="absolute inset-0"
            >
              <Card className="flex h-full flex-col gap-6 p-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Where is your mind today?</h3>
                  <p className="text-sm text-slate-500">
                    Capture the tone of your day without writing a full entry.
                  </p>
                </div>
                <div className="space-y-6">{HEADSPACE_METRICS.map(renderSlider)}</div>
                <div className="mt-auto flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(2)} className="flex-1 gap-2">
                    Next: Context <ChevronRight size={16} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : null}

          {step === 2 ? (
            <motion.div
              key="context"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="absolute inset-0"
            >
              <Card className="flex h-full flex-col gap-6 p-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">What is influencing this?</h3>
                  <p className="text-sm text-slate-500">
                    Tap any context that feels relevant today.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={
                        selectedTags.includes(tag)
                          ? "rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                          : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300"
                      }
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddTagOpen(true)}
                    className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-500"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                <label className="text-sm font-semibold text-slate-700">
                  Optional note
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Anything you want to remember about today?"
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </label>
                <div className="mt-auto flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    Back
                  </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : existingCheckIn ? "Update check-in" : "Log check-in"}
                </Button>
                </div>
              </Card>
            </motion.div>
          ) : null}

          {step === 3 ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0"
            >
              <Card className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={24} strokeWidth={3} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">Pulse recorded</h3>
                  <p className="text-sm text-slate-500">
                    Your check-in is saved and will shape your trends.
                  </p>
                </div>
                <div className="w-full space-y-2">
                  <Button
                    onClick={() =>
                      navigate("/patient/entry", {
                        state: { prefilledTags: selectedTags, prefilledContext: "Daily Pulse" },
                      })
                    }
                    className="w-full"
                  >
                    Add a journal entry
                  </Button>
                  <Button variant="secondary" onClick={() => navigate("/patient/home")} className="w-full">
                    Skip for now
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {addTagOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setAddTagOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <Card
            className="w-full max-w-md bg-white p-6 text-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Add influence</p>
              <h3 className="text-lg font-semibold">Name the influence</h3>
              <p className="text-sm text-slate-500">Keep it short so it stays scannable.</p>
            </div>
            <div className="mt-4">
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddTag();
                }}
                placeholder="Example: Family tension"
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setAddTagOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                Add tag
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default CheckInPage;
