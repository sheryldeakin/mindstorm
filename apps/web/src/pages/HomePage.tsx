import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
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
import ConnectionsGraph from "../components/features/ConnectionsGraph";
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
import DifferentialOverview from "../components/clinician/differential/DifferentialOverview";
import CriteriaCoverageBar from "../components/clinician/CriteriaCoverageBar";
import CaseStatusHeader from "../components/clinician/CaseStatusHeader";
import SymptomHeatmap from "../components/clinician/SymptomHeatmap";
import DiagnosticLogicGraph from "../components/clinician/DiagnosticLogicGraph";
import SpecifierChips from "../components/clinician/SpecifierChips";
import FunctionalImpactCard from "../components/clinician/FunctionalImpactCard";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { LlmAnalysis } from "../lib/analyzeEntry";
import type { JournalEntry, PatternMetric } from "../types/journal";
import type { PatternInfluence, CopingStrategies } from "../types/patterns";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { DifferentialDiagnosis } from "../components/clinician/differential/types";
import type { CaseEntry, RiskSignal } from "../types/clinician";

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

const MOCK_CONNECTION_NODES = [
  { id: "work", label: "Work stress" },
  { id: "anxiety", label: "Anxiety" },
  { id: "sleep", label: "Sleep" },
  { id: "conflict", label: "Conflict" },
];

const MOCK_CONNECTION_EDGES = [
  { id: "e1", from: "work", to: "anxiety", strength: 80, label: "Triggers", evidence: [] },
  { id: "e2", from: "anxiety", to: "sleep", strength: 60, label: "Disrupts", evidence: [] },
  { id: "e3", from: "sleep", to: "conflict", strength: 40, label: "Worsens", evidence: [] },
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
    userId: "demo-user",
    rangeKey: "last_30_days",
    theme: "anxiety",
    points: [
      { dateISO: "2026-01-08", intensity: 2 },
      { dateISO: "2026-01-10", intensity: 3 },
      { dateISO: "2026-01-12", intensity: 4 },
      { dateISO: "2026-01-14", intensity: 5 },
      { dateISO: "2026-01-16", intensity: 4 },
    ],
  },
  {
    userId: "demo-user",
    rangeKey: "last_30_days",
    theme: "sleep",
    points: [
      { dateISO: "2026-01-08", intensity: 1 },
      { dateISO: "2026-01-10", intensity: 2 },
      { dateISO: "2026-01-12", intensity: 3 },
      { dateISO: "2026-01-14", intensity: 4 },
      { dateISO: "2026-01-16", intensity: 3 },
    ],
  },
  {
    userId: "demo-user",
    rangeKey: "last_30_days",
    theme: "focus",
    points: [
      { dateISO: "2026-01-08", intensity: 3 },
      { dateISO: "2026-01-10", intensity: 2 },
      { dateISO: "2026-01-12", intensity: 2 },
      { dateISO: "2026-01-14", intensity: 1 },
      { dateISO: "2026-01-16", intensity: 2 },
    ],
  },
];

const DEMO_METRICS: PatternMetric[] = [
  { id: "m1", label: "Most intense day", value: "Sunday night", delta: "↑ 2 mentions", status: "up" },
  { id: "m2", label: "Top trigger", value: "Work deadlines", delta: "↑ 18%", status: "up" },
  { id: "m3", label: "Most helpful", value: "Evening walks", delta: "↓ 12%", status: "down" },
];

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

const DEMO_DIFFERENTIAL: DifferentialDiagnosis[] = [
  {
    key: "mdd",
    card: {
      key: "mdd",
      title: "Major Depressive Disorder",
      abbreviation: "MDD",
      likelihood: "Moderate",
      status: "Incomplete",
      shortSummary: "Mood symptoms present; duration criteria unclear.",
      criteriaPreview: { met: 3, total: 9 },
    },
    criteria: [],
    criteriaSummary: { current: 3, required: 5, total: 9 },
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
      title: "Persistent Depressive Disorder",
      abbreviation: "PDD",
      likelihood: "Low",
      status: "Insufficient",
      shortSummary: "Chronicity signals not yet present.",
      criteriaPreview: { met: 1, total: 6 },
    },
    criteria: [],
    criteriaSummary: { current: 1, required: 3, total: 6 },
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
      title: "Unspecified Depressive Disorder",
      abbreviation: "UDD",
      likelihood: "Low",
      status: "Incomplete",
      shortSummary: "Some depressive signals present, but criteria are limited.",
      criteriaPreview: { met: 2, total: 5 },
    },
    criteria: [],
    criteriaSummary: { current: 2, required: 4, total: 5 },
    symptomCourse: [],
    functionalImpact: [],
    exclusionChecks: [],
    prompts: [],
    specifiers: [],
  },
];

const DEMO_RISK_SIGNAL: RiskSignal = {
  detected: true,
  type: "passive_suicidality",
  level: "moderate",
  confidence: 0.62,
};

const DEMO_CASE_ENTRIES: CaseEntry[] = [
  {
    id: "case-1",
    dateISO: "2026-01-08",
    summary: "Low mood and sleep disruption after a stressful week.",
    risk_signal: null,
    evidenceUnits: [
      { span: "low mood most of the day", label: "SYMPTOM_MOOD", attributes: { polarity: "PRESENT" } },
      { span: "woke up at 3am", label: "SYMPTOM_SLEEP", attributes: { polarity: "PRESENT" } },
      { span: "work performance slipped", label: "IMPACT_WORK", attributes: { polarity: "PRESENT" } },
      { span: "felt tense all day", label: "SYMPTOM_SOMATIC", attributes: { polarity: "PRESENT" } },
    ],
  },
  {
    id: "case-2",
    dateISO: "2026-01-10",
    summary: "Difficulty concentrating during meetings.",
    risk_signal: null,
    evidenceUnits: [
      { span: "couldn't focus", label: "SYMPTOM_COGNITIVE", attributes: { polarity: "PRESENT" } },
      { span: "anxiety spike", label: "SYMPTOM_ANXIETY", attributes: { polarity: "PRESENT" } },
      { span: "missed a deadline", label: "IMPACT_WORK", attributes: { polarity: "PRESENT" } },
    ],
  },
  {
    id: "case-3",
    dateISO: "2026-01-12",
    summary: "Withdrawn socially and felt emotionally flat.",
    risk_signal: DEMO_RISK_SIGNAL,
    evidenceUnits: [
      { span: "skipped dinner with friends", label: "IMPACT_SOCIAL", attributes: { polarity: "PRESENT" } },
      { span: "feeling numb", label: "SYMPTOM_MOOD", attributes: { polarity: "PRESENT" } },
      { span: "persistent fatigue", label: "SYMPTOM_SOMATIC", attributes: { polarity: "PRESENT" } },
      { span: "thoughts of giving up", label: "SYMPTOM_RISK", attributes: { polarity: "PRESENT" } },
    ],
  },
  {
    id: "case-4",
    dateISO: "2026-01-15",
    summary: "Energy still low but able to complete a small task.",
    risk_signal: null,
    evidenceUnits: [
      { span: "low energy", label: "SYMPTOM_SOMATIC", attributes: { polarity: "PRESENT" } },
      { span: "completed laundry", label: "IMPACT_SELF_CARE", attributes: { polarity: "PRESENT" } },
      { span: "sleep improved slightly", label: "SYMPTOM_SLEEP", attributes: { polarity: "PRESENT" } },
      { span: "denied self-harm", label: "SYMPTOM_RISK", attributes: { polarity: "ABSENT" } },
    ],
  },
];

const DEMO_CASE_DENSITY = [2, 3, 1, 4, 2, 3, 5, 4, 2, 3, 1, 2];

const DEMO_COVERAGE = [
  { label: "Mood criteria", current: 3, lifetime: 4, max: 9, threshold: 5 },
  { label: "Anxiety overlap", current: 2, lifetime: 3, max: 6, threshold: 4 },
  { label: "Functional impact", current: 2, lifetime: 3, max: 6, threshold: 3 },
];

const DEMO_CLARIFICATION_PROMPTS = [
  "Confirm duration of low mood (2+ weeks).",
  "Clarify impact on self-care routines.",
  "Assess ongoing risk thoughts and safety planning.",
];

const HomePage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDomain, setActiveDomain] = useState<HomeAvatarDomain>("root");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined);
  const [selectedDxKey, setSelectedDxKey] = useState<DifferentialDiagnosis["key"]>("mdd");
  const [pinnedDxKeys, setPinnedDxKeys] = useState<DifferentialDiagnosis["key"][]>(["mdd"]);
  const [draftText, setDraftText] = useState("");
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveAnalysis, setLiveAnalysis] = useState<LlmAnalysis | null>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -90]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const yFeature1 = useTransform(scrollYProgress, [0.08, 0.28], [30, -30]);
  const yClinician = useTransform(scrollYProgress, [0.55, 0.85], [40, -40]);
  const translationRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: translationProgress } = useScroll({
    target: translationRef,
    offset: ["start start", "end end"],
  });
  const patientOpacity = useTransform(translationProgress, [0, 0.5, 0.65], [1, 1, 0]);
  const patientScale = useTransform(translationProgress, [0, 0.5, 0.65], [1, 0.98, 0.9]);
  const patientX = useTransform(translationProgress, [0, 0.5], [0, -60]);
  const clinicianOpacity = useTransform(translationProgress, [0.45, 0.7, 1], [0, 1, 1]);
  const clinicianX = useTransform(translationProgress, [0.45, 0.7], [60, 0]);
  const clinicianLift = useTransform(translationProgress, [0.45, 0.7], [20, 0]);

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

  const selectedDifferential = DEMO_DIFFERENTIAL.find((diagnosis) => diagnosis.key === selectedDxKey) ?? DEMO_DIFFERENTIAL[0];

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gradient-to-b from-slate-50 to-white text-slate-900 selection:bg-brand/20"
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 mix-blend-overlay opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.12'/%3E%3C/svg%3E\")",
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <motion.div style={{ y: yFeature1 }}>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <LineChart size={24} />
            </div>
            <h2 className="mb-6 text-4xl font-bold text-slate-900">
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight font-display">Your weekly snapshot.</h2>
            <p className="mt-4 text-lg text-slate-600">
              A calm summary of trends, emotional weather, and the life areas most affected.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/20 bg-white/50 p-6 shadow-2xl backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Emotional weather</h3>
                  <p className="text-xs text-slate-500">Themes rising together over time.</p>
                </div>
                <PatternStream series={DEMO_THEME_SERIES} rangeKey="last_30_days" />
              </div>

              <div className="rounded-3xl border border-slate-200/60 bg-white p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Top insights</h3>
                  <p className="text-xs text-slate-500">Most consistent signals this week.</p>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  {DEMO_METRICS.map((metric) => (
                    <div
                      key={metric.id}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{metric.label}</div>
                      <div className="mt-1 font-semibold text-slate-700">{metric.value}</div>
                      <div className={metric.status === "up" ? "text-rose-500" : "text-emerald-600"}>
                        {metric.delta}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/60 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Focus area</p>
                <div className="mt-4 text-3xl font-semibold text-slate-900">{DEMO_METRICS[1]?.value}</div>
                <p className="mt-1 text-sm text-rose-500">{DEMO_METRICS[1]?.delta}</p>
                <p className="mt-4 text-xs text-slate-500">
                  Most intense on Sunday nights and after late emails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={translationRef} className="relative h-[250vh] border-y border-slate-200 bg-white/80 px-6">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="relative h-[420px]">
              <motion.div
                style={{ opacity: patientOpacity, scale: patientScale, x: patientX }}
                className="absolute inset-0 z-10 flex items-center justify-center"
              >
                <div className="w-full rounded-3xl border border-slate-100 bg-white/90 p-1 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-2 rounded-t-3xl border-b border-indigo-100 bg-indigo-50/60 p-4 text-xs font-bold uppercase tracking-wide text-indigo-700">
                    <FileText size={14} /> Patient view
                  </div>
                  <div className="p-4">
                    <PatternCard
                      title={DEMO_PATTERN.title}
                      description={DEMO_PATTERN.description}
                      trend={DEMO_PATTERN.trend}
                      confidence={DEMO_PATTERN.confidence}
                      tags={DEMO_PATTERN.tags}
                      series={DEMO_PATTERN.series}
                    />
                    <div className="mt-4">
                      <ConnectionsGraph
                        nodes={MOCK_CONNECTION_NODES}
                        edges={MOCK_CONNECTION_EDGES}
                        loading={false}
                        selectedEdgeId={selectedEdgeId}
                        onEdgeSelect={(edge) => setSelectedEdgeId(edge.id)}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                style={{ opacity: clinicianOpacity, x: clinicianX, y: clinicianLift }}
                className="absolute inset-0 z-20 flex items-center justify-center"
              >
                <div className="w-full rounded-3xl border border-emerald-100 bg-white/95 p-1 shadow-2xl">
                  <div className="flex items-center gap-2 rounded-t-3xl border-b border-emerald-100 bg-emerald-50/60 p-4 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <Stethoscope size={14} /> Clinician view
                  </div>
                  <div className="space-y-4 p-4">
                    <DiagnosisCard data={DEMO_DIAGNOSIS} selected={false} pinned onSelect={() => {}} />
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                      Evidence source: {DEMO_PATTERN.tags.join(" + ")}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="lg:pt-8">
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight font-display">
                One story. <span className="text-brandLight">Two languages.</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Your words become reflective insight for you and structured evidence for your clinician.
              </p>
              <div className="mt-8 space-y-6">
                <motion.div style={{ opacity: patientOpacity }} className="border-l-2 border-indigo-200 pl-5">
                  <h3 className="text-lg font-bold text-indigo-900">For you: reflection</h3>
                  <p className="text-slate-600">
                    Non-clinical language that focuses on patterns, triggers, and what helps.
                  </p>
                </motion.div>
                <motion.div style={{ opacity: clinicianOpacity }} className="border-l-2 border-emerald-200 pl-5">
                  <h3 className="text-lg font-bold text-emerald-900">For clinicians: evidence</h3>
                  <p className="text-slate-600">
                    Criteria-aligned signals with traceable evidence and clear gaps to explore.
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-900 px-6 py-32 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),transparent_55%),radial-gradient(circle_at_30%_80%,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.1fr_1.6fr]">
          <motion.div style={{ y: yClinician }} className="lg:sticky lg:top-28 lg:self-start">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
              Clinician world
            </div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <Stethoscope size={26} />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight font-display">
              Differential evaluation <br />
              <span className="text-emerald-300">workspace.</span>
            </h2>
            <p className="mt-6 text-lg text-slate-300">
              Patients tell stories. Clinicians need evidence. MindStorm translates lived experience into criteria-aware
              signals without stripping away the human context.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                Evidence is traceable to the original text.
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                Criteria coverage supports—never replaces—clinical judgment.
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                Missing gates become clear, actionable prompts.
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex items-center gap-2 font-semibold">
                <Shield size={14} />
                Clinical safety
              </div>
              <p className="mt-2 text-emerald-100/80">
                We calculate criteria coverage, not automated diagnosis. Clinicians remain the decision makers.
              </p>
            </div>
          </motion.div>

          <motion.div
            style={{ y: yClinician }}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Differential overview</h3>
                  <p className="text-xs text-slate-400">Ranked by criteria coverage.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200">
                  DSM-5 logic active
                </span>
              </div>
              <div className="mt-4 grid gap-6 lg:grid-cols-[240px_1fr]">
                <div>
                  <DifferentialOverview
                    diagnoses={DEMO_DIFFERENTIAL}
                    selectedKey={selectedDxKey}
                    pinnedKeys={pinnedDxKeys}
                    onSelect={setSelectedDxKey}
                    onTogglePin={(key) => {
                      setPinnedDxKeys((prev) =>
                        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
                      );
                    }}
                  />
                </div>
                <div className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-sm font-semibold text-slate-700">Selected candidate</h3>
                    <p className="mt-1 text-xs text-slate-500">Criteria coverage preview for the active diagnosis.</p>
                    <div className="mt-4">
                      <DiagnosisCard
                        data={selectedDifferential.card}
                        selected
                        pinned={pinnedDxKeys.includes(selectedDifferential.key)}
                        onSelect={() => {}}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <CriteriaCoverageBar label="Mood criteria" current={3} lifetime={4} max={9} threshold={5} />
                      <CriteriaCoverageBar label="Functional impact" current={2} lifetime={3} max={6} threshold={3} />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="text-sm font-semibold text-slate-700">Evidence checklist preview</h3>
                    <p className="mt-1 text-xs text-slate-500">Signals mapped to DSM-5-informed criteria.</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      {[
                        "Low mood most days (4 entries)",
                        "Sleep disruption present (3 entries)",
                        "Energy reduction noted (2 entries)",
                        "Impairment in work functioning (2 entries)",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <span>{item}</span>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Evidence linked
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                <FileText size={12} />
                Traceable evidence
              </div>
              <p className="italic text-slate-200">
                “I haven't been able to focus on work assignments for weeks…”
              </p>
              <p className="mt-2 italic text-slate-200">
                “I keep canceling plans because I'm too tired to pretend…”
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-sm font-semibold text-slate-100">Case overview</h3>
              <p className="mt-1 text-xs text-slate-400">Signals summarized across recent entries.</p>
              <div className="mt-6 space-y-6">
                <CaseStatusHeader
                  name="Case: Jamie R."
                  lastEntryDate={DEMO_CASE_ENTRIES[DEMO_CASE_ENTRIES.length - 1]?.dateISO || ""}
                  riskSignal={DEMO_RISK_SIGNAL}
                  densitySeries={DEMO_CASE_DENSITY}
                  newCriticalCount={1}
                  unknownGateCount={2}
                />

                <Card className="p-6">
                  <h3 className="text-lg font-semibold">Clinical course heatmap</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Daily evidence clusters with new activity highlighted.
                  </p>
                  <div className="mt-4">
                    <SymptomHeatmap entries={DEMO_CASE_ENTRIES} />
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                  {DEMO_COVERAGE.map((item) => (
                    <CriteriaCoverageBar
                      key={item.label}
                      label={item.label}
                      current={item.current}
                      lifetime={item.lifetime}
                      max={item.max}
                      threshold={item.threshold}
                    />
                  ))}
                </div>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold">Diagnostic logic graph</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Nodes update based on present, denied, or missing evidence.
                  </p>
                  <div className="mt-4">
                    <DiagnosticLogicGraph entries={DEMO_CASE_ENTRIES} onNodeSelect={() => {}} />
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold">Specifier trajectory</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Active specifiers are bold; historical specifiers show date ranges.
                  </p>
                  <div className="mt-4">
                    <SpecifierChips entries={DEMO_CASE_ENTRIES} />
                  </div>
                </Card>

                <FunctionalImpactCard entries={DEMO_CASE_ENTRIES} />

                <Card className="p-6">
                  <h3 className="text-lg font-semibold">Needs clarification</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Prompts generated for missing or ambiguous signals.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {DEMO_CLARIFICATION_PROMPTS.map((prompt) => (
                      <li key={prompt}>• {prompt}</li>
                    ))}
                  </ul>
                </Card>
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
