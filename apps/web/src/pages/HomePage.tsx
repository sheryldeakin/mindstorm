import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  ArrowRightLeft,
  ArrowRight,
  AlertTriangle,
  Brain,
  CheckCircle2,
  FileText,
  LineChart,
  Shield,
  Share2,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import HomeAvatarScene, { type HomeAvatarDomain } from "../components/avatar/HomeAvatarScene";
import HeroMockup from "../components/features/HeroMockup";
import NeuralCircuit, { type NeuralCircuitEdge, type NeuralCircuitNode } from "../components/features/NeuralCircuit";
import LiveInsightPanel from "../components/features/LiveInsightPanel";
import PatternStream from "../components/features/PatternStream";
import LifeBalanceCompass from "../components/features/LifeBalanceCompass";
import RecentEmotionsPulse from "../components/features/RecentEmotionsPulse";
import PatternHighlights from "../components/features/PatternHighlights";
import InfluencesPanel from "../components/features/InfluencesPanel";
import CopingStrategiesPanel from "../components/features/CopingStrategiesPanel";
import ExploreQuestionsPanel from "../components/features/ExploreQuestionsPanel";
import PatternCard from "../components/patterns/PatternCard";
import DiagnosisCard from "../components/clinician/differential/DiagnosisCard";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { LlmAnalysis } from "../lib/analyzeEntry";
import type { JournalEntry } from "../types/journal";
import type { PatternInfluence, CopingStrategies } from "../types/patterns";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import DifferentialOverview from "../components/clinician/differential/DifferentialOverview";
import CriteriaCoverageBar from "../components/clinician/CriteriaCoverageBar";
import type { DifferentialDiagnosis } from "../components/clinician/differential/types";

const MOCK_NEURAL_NODES: NeuralCircuitNode[] = [
  { id: "work", label: "Work pressure", kind: "context" },
  { id: "rumination", label: "Rumination", kind: "symptom" },
  { id: "sleep", label: "Poor sleep", kind: "symptom" },
  { id: "energy", label: "Low energy", kind: "impact" },
  { id: "withdrawal", label: "Social withdrawal", kind: "impact" },
  { id: "tension", label: "Body tension", kind: "symptom" },
];

const MOCK_NEURAL_EDGES: NeuralCircuitEdge[] = [
  { from: "work", to: "rumination" },
  { from: "rumination", to: "sleep" },
  { from: "sleep", to: "energy" },
  { from: "energy", to: "withdrawal" },
  { from: "withdrawal", to: "rumination" },
  { from: "work", to: "tension" },
  { from: "tension", to: "sleep" },
  { from: "sleep", to: "rumination" },
];

const DEMO_DRAFT_TEXT =
  "I've been waking up around 3am all week, and my mind spirals about work. I keep replaying conversations and feel on edge the next day.";

const DEMO_LIVE_ANALYSIS: LlmAnalysis = {
  emotions: [
    { label: "Anxiety", intensity: 78, tone: "negative" },
    { label: "Overwhelm", intensity: 64, tone: "negative" },
    { label: "Restlessness", intensity: 52, tone: "neutral" },
  ],
  themes: ["Sleep", "Workload", "Nervous system"],
  triggers: ["Deadlines", "Nighttime rumination"],
  languageReflection:
    "You mention feeling \"on edge\" and \"spiraling,\" which can signal a heightened stress response.",
  timeReflection: "This sounds like it has been happening throughout the week, with nightly patterns.",
  summary:
    "Sleep disruption seems to amplify anxious thoughts, especially around work conversations.",
};

const DEMO_ENTRIES: JournalEntry[] = [
  {
    id: "entry-1",
    date: "Mon · 7:42 PM",
    dateISO: "2026-01-12",
    title: "Sunday night spiral",
    summary: "Fell asleep late and woke up anxious about Monday.",
    emotions: [
      { label: "Anxiety", intensity: 74, tone: "negative" },
      { label: "Tension", intensity: 61, tone: "negative" },
    ],
    tags: ["work", "sleep"],
    themes: ["Workload", "Sleep"],
    evidenceUnits: [{ span: "work email backlog", label: "IMPACT_WORK" }],
  },
  {
    id: "entry-2",
    date: "Tue · 9:10 PM",
    dateISO: "2026-01-13",
    title: "Energy dip",
    summary: "Felt drained after meetings and skipped the gym.",
    emotions: [{ label: "Low energy", intensity: 58, tone: "negative" }],
    tags: ["routine", "health"],
    themes: ["Self care"],
    evidenceUnits: [{ span: "skipped workout", label: "IMPACT_SELF_CARE" }],
  },
  {
    id: "entry-3",
    date: "Wed · 6:05 PM",
    dateISO: "2026-01-14",
    title: "Social withdrawal",
    summary: "Canceled plans and stayed home to recharge.",
    emotions: [{ label: "Irritability", intensity: 49, tone: "negative" }],
    tags: ["friends", "social"],
    themes: ["Connection"],
    evidenceUnits: [{ span: "canceled dinner", label: "IMPACT_SOCIAL" }],
  },
  {
    id: "entry-4",
    date: "Thu · 8:22 PM",
    dateISO: "2026-01-15",
    title: "Calmer afternoon",
    summary: "Long walk helped reset my mood.",
    emotions: [
      { label: "Relief", intensity: 55, tone: "positive" },
      { label: "Calm", intensity: 60, tone: "positive" },
    ],
    tags: ["walk", "routine"],
    themes: ["Recovery"],
    evidenceUnits: [{ span: "took a long walk", label: "IMPACT_SELF_CARE" }],
  },
];

const DEMO_THEME_SERIES: ThemeSeries[] = [
  {
    userId: "demo",
    rangeKey: "week",
    theme: "Anxiety",
    points: [
      { dateISO: "2023-01-01", intensity: 2 },
      { dateISO: "2023-01-02", intensity: 5 },
      { dateISO: "2023-01-03", intensity: 3 },
      { dateISO: "2023-01-04", intensity: 6 },
      { dateISO: "2023-01-05", intensity: 4 },
    ],
  },
];

const DEMO_METRICS = [
  { label: "Most intense day", value: "Sunday night", delta: "↑ 2 mentions" },
  { label: "Top trigger", value: "Work deadlines", delta: "↑ 18%" },
  { label: "Most helpful", value: "Evening walks", delta: "↓ 12%" },
];

const OVERLAP_DIFFERENTIAL: DifferentialDiagnosis[] = [
  {
    key: "mdd",
    card: {
      key: "mdd",
      title: "Major Depressive Disorder",
      abbreviation: "MDD",
      likelihood: "High",
      status: "Sufficient",
      shortSummary: "Mood symptoms present with impairment.",
      criteriaPreview: { met: 5, total: 9 },
    },
    criteria: [],
    criteriaSummary: { current: 5, required: 5, total: 9 },
    symptomCourse: [],
    functionalImpact: [],
    exclusionChecks: [],
    prompts: [],
    specifiers: [],
  },
  {
    key: "pdd",
    card: {
      key: "pdd",
      title: "Generalized Anxiety",
      abbreviation: "GAD",
      likelihood: "Moderate",
      status: "Incomplete",
      shortSummary: "Worry and tension present; duration unclear.",
      criteriaPreview: { met: 3, total: 6 },
    },
    criteria: [],
    criteriaSummary: { current: 3, required: 4, total: 6 },
    symptomCourse: [],
    functionalImpact: [],
    exclusionChecks: [],
    prompts: [],
    specifiers: [],
  },
  {
    key: "udd",
    card: {
      key: "udd",
      title: "Bipolar II",
      abbreviation: "BP-II",
      likelihood: "Low",
      status: "Insufficient",
      shortSummary: "Depressive symptoms present; mania history unconfirmed.",
      criteriaPreview: { met: 2, total: 7 },
      blocked: true,
      blockedReason: "No mania history",
    },
    criteria: [],
    criteriaSummary: { current: 2, required: 4, total: 7 },
    symptomCourse: [],
    functionalImpact: [],
    exclusionChecks: [],
    prompts: [],
    specifiers: [],
  },
];

const OVERLAP_SUFFICIENCY = {
  mdd: {
    status: "Sufficient",
    note: "Meets minimum criteria for MDD; rule-outs remain visible.",
    bars: [
      { label: "Mood criteria (MDD)", current: 5, lifetime: 6, max: 9, threshold: 5 },
      { label: "Functional impairment", current: 2, lifetime: 3, max: 4, threshold: 3 },
    ],
    prompts: ["Clarify symptom duration (2+ weeks)", "Confirm impairment across work or self-care"],
  },
  pdd: {
    status: "Incomplete",
    note: "Criteria trending upward; duration gate still missing.",
    bars: [
      { label: "Anxiety criteria (GAD)", current: 3, lifetime: 4, max: 6, threshold: 4 },
      { label: "Functional impairment", current: 2, lifetime: 3, max: 4, threshold: 3 },
    ],
    prompts: ["Verify 6-month duration of worry", "Confirm restlessness and muscle tension"],
  },
  udd: {
    status: "Insufficient",
    note: "Rule-out active until mania history is excluded.",
    bars: [
      { label: "Mood episode duration", current: 1, lifetime: 1, max: 2, threshold: 2 },
      { label: "Mania gate (Bipolar II)", current: 0, lifetime: 0, max: 1, threshold: 1 },
    ],
    prompts: ["Screen for hypomanic episodes", "Review family history of bipolar disorder"],
  },
} satisfies Record<
  DifferentialDiagnosis["key"],
  {
    status: "Sufficient" | "Incomplete" | "Insufficient";
    note: string;
    bars: Array<{ label: string; current: number; lifetime: number; max: number; threshold: number }>;
    prompts: string[];
  }
>;

const DEMO_INFLUENCES: PatternInfluence[] = [
  {
    id: "inf-1",
    label: "Late-night work",
    detail: "Anxiety climbs on days with work after 8pm.",
    direction: "up",
    confidence: 78,
  },
  {
    id: "inf-2",
    label: "Morning routine",
    detail: "Lower stress on days with a stable morning routine.",
    direction: "down",
    confidence: 64,
  },
  {
    id: "inf-3",
    label: "Social plans",
    detail: "Tension stays steady when social plans are low-pressure.",
    direction: "steady",
    confidence: 52,
  },
  {
    id: "inf-4",
    label: "Sleep window",
    detail: "Short nights often lead to more rumination the next day.",
    direction: "up",
    confidence: 71,
  },
];

const DEMO_STRATEGIES: CopingStrategies = {
  userTagged: ["Breathing break", "Short walk", "Cut caffeine after 3pm"],
  suggested: ["Stretch before bed", "Text a friend", "Light wind-down ritual"],
};

const DEMO_QUESTIONS = [
  "What changed on the days the anxiety felt lighter?",
  "Which part of the workday is most draining lately?",
  "How does your body signal the stress loop before it peaks?",
];

const DEMO_PATTERN = {
  title: "Sleep and anxiety loop",
  description: "Anxiety spikes often follow nights with fewer than 6 hours of sleep.",
  trend: "up" as const,
  confidence: "high" as const,
  tags: ["Sleep", "Work stress"],
  series: [3, 4, 5, 3, 6, 7, 6, 5, 7, 8, 7, 6],
};

const DEMO_DIAGNOSIS = {
  key: "mdd" as const,
  title: "Major Depressive Disorder",
  abbreviation: "MDD",
  likelihood: "Moderate" as const,
  status: "Incomplete" as const,
  shortSummary: "Mood symptoms present; duration criteria unclear.",
  criteriaPreview: { met: 3, total: 9 },
  blocked: false,
};

const HomePage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDomain, setActiveDomain] = useState<HomeAvatarDomain>("root");
  const [draftText, setDraftText] = useState("");
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveAnalysis, setLiveAnalysis] = useState<LlmAnalysis | null>(null);
  const [selectedOverlapKey, setSelectedOverlapKey] = useState<DifferentialDiagnosis["key"]>("mdd");
  const [pinnedOverlapKeys, setPinnedOverlapKeys] = useState<DifferentialDiagnosis["key"][]>([]);
  const lastOverlapInteractionRef = useRef<number>(0);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -90]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const yFeature1 = useTransform(scrollYProgress, [0.08, 0.28], [30, -30]);
  const yClinician = useTransform(scrollYProgress, [0.55, 0.85], [40, -40]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveDomain((prev) => {
        if (prev === "root") return "context";
        if (prev === "context") return "symptom";
        if (prev === "symptom") return "impact";
        return "root";
      });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [DEMO_DRAFT_TEXT, DEMO_LIVE_ANALYSIS]);

  useEffect(() => {
    let timers: number[] = [];
    let isActive = true;

    const clearTimers = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };

    const runDemo = () => {
      if (!isActive) return;
      clearTimers();
      setDraftText("");
      setLiveLoading(true);
      setLiveAnalysis(null);

      const typeDelay = 26;
      const introDelay = 400;
      const analysisDelay = 700;
      const holdAfterAnalysis = 20000;

      let index = 0;

      const typeNext = () => {
        if (!isActive) return;
        index += 1;
        setDraftText(DEMO_DRAFT_TEXT.slice(0, index));
        if (index < DEMO_DRAFT_TEXT.length) {
          timers.push(window.setTimeout(typeNext, typeDelay));
          return;
        }

        timers.push(
          window.setTimeout(() => {
            if (!isActive) return;
            setLiveAnalysis(DEMO_LIVE_ANALYSIS);
            setLiveLoading(false);
            timers.push(window.setTimeout(runDemo, holdAfterAnalysis));
          }, analysisDelay),
        );
      };

      timers.push(window.setTimeout(typeNext, introDelay));
    };

    runDemo();

    return () => {
      isActive = false;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    const sequence: DifferentialDiagnosis["key"][] = ["mdd", "pdd"];
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now - lastOverlapInteractionRef.current < 6000) return;
      setSelectedOverlapKey((prev) => {
        const idx = sequence.indexOf(prev);
        const next = sequence[(idx + 1) % sequence.length] ?? "mdd";
        return next;
      });
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 to-white text-slate-900 selection:bg-brand/20"
    >
      <div
        className="pointer-events-none fixed inset-0 z-50 bg-[url('/noise.png')] opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative z-10">
      <section className="relative flex h-screen w-full items-center justify-center">
        <div className="absolute inset-0 z-0">
          <HomeAvatarScene
            activeDomain={activeDomain}
            onSelectDomain={setActiveDomain}
            moodIntensity={0.6}
            enableIdleWave
            emotions={[
              { label: "Reflecting", intensity: 60, tone: "neutral" },
              { label: "Connecting", intensity: 80, tone: "positive" },
            ]}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-[#f8fafc]" />
        </div>

        <motion.div
          style={{ y: yHero, opacity: opacityHero }}
          className="relative z-10 max-w-4xl px-6 pt-20 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-1.5 text-sm font-medium text-slate-600 backdrop-blur-md shadow-sm">
            <Sparkles size={14} className="text-brand" />
            <span>AI-powered dual sense-making</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight font-display text-slate-900 md:text-7xl">
            Your mind is not <br />
            <span className="text-brandLight">a black box.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-slate-600">
            Turn messy thoughts into clear patterns. MindStorm bridges the gap between
            <strong> personal reflection</strong> and <strong>clinical evidence</strong>.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link to="/login">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg shadow-glow">
                Start journaling
              </Button>
            </Link>
            <a href="#features">
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full bg-white/50 px-8 py-6 text-lg backdrop-blur-md"
              >
                View demo
              </Button>
            </a>
          </div>
        </motion.div>
      </section>

      <section id="features" className="relative px-6 py-32">
        <div className="page-container grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div className="order-2 relative lg:order-1">
            <div className="absolute inset-0 rounded-full bg-brand/5 blur-3xl" />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <HeroMockup />
            </motion.div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Activity size={24} />
            </div>
            <h2 className="mb-6 text-4xl font-bold text-slate-900 tracking-tight font-display">
              Just write. <br />
              <span className="text-slate-400">We find the signal.</span>
            </h2>
            <p className="mb-6 text-lg text-slate-600">
              Skip the tracking codes and spreadsheets. MindStorm extracts emotions, triggers, and themes automatically
              while you write.
            </p>
            <ul className="space-y-4">
              {[
                "Real-time insight extraction",
                "Gentle, non-clinical language",
                "Private by default",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-slate-700">
                  <div className="h-2 w-2 rounded-full bg-brandLight" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-32">
        <div className="page-container grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <motion.div style={{ y: yFeature1 }}>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <LineChart size={24} />
            </div>
            <h2 className="mb-6 text-4xl font-bold text-slate-900 tracking-tight font-display">
              Live reflections as you write.
            </h2>
            <p className="mb-6 text-lg text-slate-600">
              Your draft becomes structured signals in real time—emotions, context, and the questions that help you go
              deeper.
            </p>
            <Card className="p-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Draft entry</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {draftText || "Start typing to capture how today felt."}
                <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-full bg-slate-400/70" />
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">3am wake-ups</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Work rumination</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Body tension</span>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <LiveInsightPanel
              analysis={liveAnalysis}
              loading={liveLoading}
              draftText={draftText}
              processingLabel={liveLoading ? "Analyzing your draft for signals..." : undefined}
            />
          </motion.div>
        </div>
      </section>

      <section className="relative bg-white/50 px-6 py-32">
        <div className="page-container grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Brain size={24} />
            </div>
            <h2 className="mb-6 text-4xl font-bold text-slate-900 tracking-tight font-display">Explore your neural circuit.</h2>
            <p className="mb-6 text-lg text-slate-600">
              Tap a node to surface its feedback loops, or pick two to map the shortest path between them. MindStorm
              turns messy feelings into an interactive circuit you can explore.
            </p>
            <Link to="/login">
              <Button variant="ghost" className="gap-2 pl-0 transition-all hover:gap-4">
                Explore the circuit <ArrowRight size={16} />
              </Button>
            </Link>
          </div>

          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="ml-auto w-full translate-x-10">
              <NeuralCircuit nodes={MOCK_NEURAL_NODES} edges={MOCK_NEURAL_EDGES} showPanel={false} bare autoDemo />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 py-32">
        <div className="page-container">
          <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Your weekly snapshot.</h2>
            <p className="mt-4 text-lg text-slate-600">
              A calm summary of trends, emotional weather, and the life areas most affected.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2 bg-white/60 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-sm p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Emotional weather</h3>
                  <p className="text-xs text-slate-500">Themes rising together over the last week.</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Activity size={18} />
                </div>
              </div>
              <PatternStream series={DEMO_THEME_SERIES} rangeKey="week" />
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-sm p-6">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-700">Top insights</h3>
                <p className="text-xs text-slate-500">The strongest signals this week.</p>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                {DEMO_METRICS.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</div>
                    <div className="mt-1 font-semibold text-slate-700">{metric.value}</div>
                    <div className={metric.delta.startsWith("↑") ? "text-rose-500" : "text-emerald-600"}>
                      {metric.delta}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-sm p-6 md:col-start-3 md:row-start-2">
              <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 opacity-80" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Focus area</p>
                <Sparkles size={18} className="text-rose-400" />
              </div>
              <div className="mt-6 text-3xl font-semibold text-slate-900">{DEMO_METRICS[1]?.value}</div>
              <p className="mt-1 text-sm text-rose-500">{DEMO_METRICS[1]?.delta}</p>
              <p className="mt-4 text-xs text-slate-500">
                Most intense on Sunday nights and after late emails.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-slate-200 bg-white/80 px-6 py-32">
        <div className="page-container">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight font-display">
              One story. <span className="text-brandLight">Two languages.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Your words become reflective insight for you and structured evidence for your clinician.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur">
                <ArrowRightLeft size={14} className="text-brand" />
                Translation
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-[32px] border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
                <FileText size={14} />
                For You: Reflection
              </div>
              <PatternCard
                title={DEMO_PATTERN.title}
                description={DEMO_PATTERN.description}
                trend={DEMO_PATTERN.trend}
                confidence={DEMO_PATTERN.confidence}
                tags={DEMO_PATTERN.tags}
                series={DEMO_PATTERN.series}
              />
              <p className="mt-4 text-sm text-slate-500 italic">I see patterns in my sleep and anxiety...</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                <Stethoscope size={14} />
                For Clinicians: Evidence
              </div>
              <DiagnosisCard data={DEMO_DIAGNOSIS} selected={false} pinned onSelect={() => {}} />
              <h3 className="mt-4 text-xl font-semibold text-slate-900 tracking-tight font-display">
                Reduce misdiagnosis. Validated care.
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                Diagnostic error often comes from missing context or confusing overlapping symptoms. By structuring
                evidence against DSM-5 criteria, MindStorm ensures critical rule-outs aren't missed—so patients get the
                right treatment plan without having to constantly retell their story.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-50 px-6 py-28 text-slate-900">
        <div className="page-container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-tight font-display">Untangle overlapping symptoms.</h2>
            <p className="mt-4 text-lg text-slate-600">
              Fatigue, insomnia, and worry appear in dozens of diagnoses. MindStorm visualizes specific criteria
              coverage side-by-side, highlighting exactly where a diagnosis fits—and where it fails (e.g., a "Mania"
              exclusionary gate blocking MDD).
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Differential overview</h3>
                  <p className="text-xs text-slate-500">Competing hypotheses at a glance.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  DSM-5 logic active
                </span>
              </div>
              <div className="mt-5">
                <DifferentialOverview
                  diagnoses={OVERLAP_DIFFERENTIAL}
                  selectedKey={selectedOverlapKey}
                  pinnedKeys={pinnedOverlapKeys}
                  onSelect={(key) => {
                    const isBlocked = OVERLAP_DIFFERENTIAL.find((item) => item.key === key)?.card.blocked;
                    if (isBlocked) return;
                    lastOverlapInteractionRef.current = Date.now();
                    setSelectedOverlapKey(key);
                  }}
                  onTogglePin={(key) => {
                    setPinnedOverlapKeys((prev) =>
                      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
                    );
                  }}
                  className="[&>div]:border-slate-200/70 [&>div]:bg-slate-50/70 [&>div]:shadow-sm [&_[aria-pressed=true]]:border-blue-400 [&_[aria-pressed=true]]:bg-blue-50 [&_[aria-pressed=true]]:shadow-md"
                />
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Criteria sufficiency</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Thresholds show when a diagnosis is sufficiently supported.
                  </p>
                </div>
                <span
                  className={
                    OVERLAP_SUFFICIENCY[selectedOverlapKey].status === "Sufficient"
                      ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                      : OVERLAP_SUFFICIENCY[selectedOverlapKey].status === "Incomplete"
                        ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  }
                >
                  {OVERLAP_SUFFICIENCY[selectedOverlapKey].status}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {OVERLAP_SUFFICIENCY[selectedOverlapKey].bars.map((bar) => (
                  <CriteriaCoverageBar
                    key={bar.label}
                    label={bar.label}
                    current={bar.current}
                    lifetime={bar.lifetime}
                    max={bar.max}
                    threshold={bar.threshold}
                  />
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                {OVERLAP_SUFFICIENCY[selectedOverlapKey].note}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  To further evaluate
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  {OVERLAP_SUFFICIENCY[selectedOverlapKey].prompts.map((prompt) => (
                    <li key={prompt} className="flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 text-amber-500" />
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-50 px-6 py-32 text-slate-900">
        <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.1fr_1fr]">
          <motion.div style={{ y: yClinician }} className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-500">
              Clinician safety
            </div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Stethoscope size={26} />
            </div>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight font-display">
              Reduce misdiagnosis with <br />
              <span className="text-emerald-600">structured evidence.</span>
            </h2>
            <p className="mt-6 text-lg text-slate-600">
              Diagnostic error often stems from inconsistent data gathering. MindStorm standardizes the intake
              process, ensuring critical rule-outs (like Bipolar history or Substance use) are flagged before you
              diagnose.
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              {[
                "Standardized Criteria Checks: Verify duration and impairment gates automatically.",
                "Automatic Rule-Outs: Surface exclusionary criteria that are easily missed in brief sessions.",
                "Traceable Evidence: Every claim links back to the patient's original words.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Shield size={14} />
                Diagnostic safety
              </div>
              <p className="mt-2 text-slate-500">
                We highlight exclusions and coverage gaps to prevent premature closure, not to automate diagnoses.
              </p>
            </div>
          </motion.div>

          <motion.div
            style={{ y: yClinician }}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center"
          >
            <div className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Major Depressive Disorder</h3>
                  <p className="text-xs text-slate-500">Clinical summary card</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Likelihood: High
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-slate-500" />
                    <span>Criteria Coverage</span>
                  </div>
                  <span>5/9</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 w-[56%] rounded-full bg-slate-900" />
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-500">Status: Sufficient</div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <AlertTriangle size={14} />
                ⚠️ Rule-out: Screen for Manic History
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
            <Share2 size={32} />
          </div>

          <h2 className="mb-8 text-4xl font-bold text-slate-900 md:text-5xl tracking-tight font-display">
            Bridging the gap to <br />
            <span className="text-emerald-600">clinical care.</span>
          </h2>

          <div className="mt-16 grid gap-8 text-left md:grid-cols-2">
            <Card className="border-brand/5 p-8 transition-colors hover:border-brand/20">
              <h3 className="mb-3 text-xl font-bold text-slate-800">For you</h3>
              <p className="mb-6 text-slate-600">
                Generate a session brief that summarizes your week's patterns, struggles, and wins in plain language.
              </p>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 italic">
                "I've been feeling anxious about work (3x mentions), mostly on Sunday nights..."
              </div>
            </Card>

            <Card className="border-brand/5 p-8 transition-colors hover:border-brand/20">
              <h3 className="mb-3 text-xl font-bold text-slate-800">For your clinician</h3>
              <p className="mb-6 text-slate-600">
                A structured appendix maps your entries to clinical criteria (DSM-5 informed) to support their
                reasoning.
              </p>
              <div className="rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-500">
                Evidence: SYMPTOM_ANXIETY (High confidence) <br />
                Context: IMPACT_WORK
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-3xl font-bold text-slate-900 tracking-tight font-display">Start making sense of the storm.</h2>
          <p className="mb-10 text-slate-600">Private, secure, and designed for dual sense-making.</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/login">
              <Button size="lg" className="rounded-full px-10 py-4 text-lg">
                Get started free
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield size={14} />
              <span>End-to-end encrypted exports</span>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default HomePage;
