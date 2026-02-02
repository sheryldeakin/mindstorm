import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ArrowRight,
  Clock,
  Heart,
  FileText,
  Target,
  Lightbulb,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Repeat,
  HelpCircle,
  Shield,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Tabs from "../components/ui/Tabs";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const trendData = [
  { date: "Jan 1", anxiety: 6, energy: 3, mood: 4, sleep: 5 },
  { date: "Jan 5", anxiety: 7, energy: 4, mood: 5, sleep: 4 },
  { date: "Jan 10", anxiety: 8, energy: 3, mood: 4, sleep: 3 },
  { date: "Jan 15", anxiety: 5, energy: 5, mood: 6, sleep: 4 },
  { date: "Jan 20", anxiety: 4, energy: 6, mood: 7, sleep: 6 },
  { date: "Jan 25", anxiety: 5, energy: 7, mood: 6, sleep: 7 },
  { date: "Jan 29", anxiety: 4, energy: 6, mood: 7, sleep: 6 },
];
const medicationChanges = [
  { date: "Jan 15", label: "Medication change" },
];

const narrativeNotes = [
  {
    date: "Jan 28, 2026",
    emotionalTone: "positive" as const,
    summary: "Client expressed feeling \"lighter\" this week. Mentioned that talking to their therapist friend helped them realize they’re not alone in their struggles. Still worried about work presentation.",
    themes: ["Social support", "Self-compassion", "Work anxiety"],
  },
  {
    date: "Jan 22, 2026",
    emotionalTone: "negative" as const,
    summary: "Difficult week. Client described feeling \"stuck in quicksand\"—the more they try to escape, the deeper they sink. This metaphor has appeared three times now.",
    themes: ["Hopelessness", "Avoidance", "Overused metaphor"],
  },
  {
    date: "Jan 15, 2026",
    emotionalTone: "neutral" as const,
    summary: "Started new medication. Client feeling hopeful but cautious. Discussed past medication experiences and their fear of \"being let down again.\"",
    themes: ["Hope", "Medication", "Trust"],
  },
];
const repeatedMetaphors = [
  "“Stuck in quicksand” (3x)",
  "“Running on empty” (2x)",
  "“Wearing a mask” (1x)",
];
const unresolvedThreads = [
  "Relationship strain: self-attended conflict but hasn’t elaborated",
  "Reference to “the incident at work” from 2 months ago",
];
const diagnosticProfiles = [
  {
    name: "Major Depressive Disorder (Moderate)",
    confidence: "high",
    criteria: [
      { criterion: "Depressed mood most of the day, nearly every day", status: "supported" },
      { criterion: "Diminished interest or pleasure in activities", status: "supported" },
      { criterion: "Significant weight loss or decrease in appetite", status: "partial" },
      { criterion: "Insomnia or hypersomnia", status: "supported" },
      { criterion: "Fatigue or loss of energy", status: "supported" },
      { criterion: "Feelings of worthlessness", status: "supported" },
      { criterion: "Duration > 2 weeks", status: "supported" },
    ],
    ruleOuts: ["Bipolar disorder", "Hypothyroidism", "Substance-induced"],
  },
  {
    name: "Generalized Anxiety Disorder",
    confidence: "medium",
    criteria: [
      { criterion: "Excessive anxiety and worry", status: "supported" },
      { criterion: "Difficulty controlling worry", status: "supported" },
      { criterion: "Restlessness", status: "partial" },
      { criterion: "Easily fatigued", status: "supported" },
      { criterion: "Difficulty concentrating", status: "supported" },
      { criterion: "Duration ≥ 6 months", status: "absent" },
    ],
    ruleOuts: ["Panic disorder", "Social anxiety"],
  },
];
const diagnosticNextSteps = [
  "Monitor GAD symptoms over next month to assess 6-month duration criterion",
  "Screen for PTSD given reference to “work incident”",
  "Consider assessment for ADHD (inattention difficulties)",
];
const strengthsValues = ["Authenticity", "Creativity", "Connection with others", "Personal growth"];
const strengthsAssets = [
  "Articulate and self-aware",
  "Strong problem-solving skills",
  "Resilient",
  "Compassionate",
];
const strengthsRoles = ["Graphic designer", "Friend and confidant", "Amateur photographer", "Dog parent"];
const strengthsProtectiveFactors = [
  "Strong friendship network",
  "Creative outlets",
  "Stable housing",
  "Engaged in therapy",
];
const tabOptions = [
  { id: "narrative", label: "Narrative" },
  { id: "causal", label: "Causal Map" },
  { id: "diagnostic", label: "Diagnostic" },
  { id: "treatment", label: "Treatment" },
  { id: "strengths", label: "Strengths" },
];
const treatmentGoals = [
  { goal: "Reduce avoidance behaviors at work", status: "active" },
  { goal: "Improve sleep hygiene and quality", status: "active" },
  { goal: "Establish daily self-compassion practice", status: "active" },
];
const treatmentHypotheses = [
  {
    hypothesis: "sleep quality improves",
    prediction: "energy and concentration should improve, reducing work anxiety",
  },
  {
    hypothesis: "client reduces avoidance at work",
    prediction: "short-term anxiety increases, but long-term confidence building",
  },
];
const treatmentInterventions = [
  {
    intervention: "Cognitive restructuring around work performance",
    response: "effective",
    notes: "Client able to identify and challenge catastrophic thinking",
  },
  {
    intervention: "Behavioral Activation (social engagement)",
    response: "unclear",
    notes: "Some progress but inconsistent follow-through",
  },
  {
    intervention: "Mindfulness meditation",
    response: "ineffective",
    notes: "Client finds it increases anxiety rather than reducing it",
  },
];
const treatmentNotWorking = [
  "Traditional mindfulness meditation (increases anxiety)",
  "Scheduling social activities too far in advance (leads to cancellations)",
];

const riskTrend = "decreasing" as const;
const protectiveFactorStrength = "medium" as const;
const earlyWarningSignals = [
  "Increased isolation from friends",
  "Increased rumination on work",
  "Mentions of feeling “burden” to others",
];
const safetyPlanStatus = "Updated: Jan 14, 2026 — Client has crisis contacts accessible.";
const recentCrisisEvents = [
  { date: "Jan 24, 2026", event: "Passive ideation, no plan or intent" },
  { date: "Nov 15, 2025", event: "Self-harm urge resolved, used safety plan" },
];
const causalNodes = [
  { id: "trigger-work", label: "Work stress", type: "trigger" },
  { id: "thought-failing", label: "I’m failing", type: "thought" },
  { id: "thought-handle", label: "I can’t handle this", type: "thought" },
  { id: "emotion-anxiety", label: "Anxiety", type: "emotion" },
  { id: "emotion-shame", label: "Shame", type: "emotion" },
  { id: "behavior-avoidance", label: "Avoidance", type: "behavior" },
  { id: "consequence-sleep", label: "Sleep disruption", type: "consequence" },
];
const causalConnections = [
  { from: "behavior-avoidance", to: "emotion-anxiety", strength: "strong", type: "reinforcing" },
  { from: "consequence-sleep", to: "emotion-shame", strength: "moderate", type: "reinforcing" },
];
const causalTypeColors = {
  trigger: "bg-orange-100 text-orange-800 border-orange-200",
  thought: "bg-blue-100 text-blue-800 border-blue-200",
  emotion: "bg-purple-100 text-purple-800 border-purple-200",
  behavior: "bg-green-100 text-green-800 border-green-200",
  consequence: "bg-red-100 text-red-800 border-red-200",
};

const getTrendColor = (trend: string) => {
  switch (trend) {
    case "decreasing":
      return "text-green-600";
    case "stable":
      return "text-yellow-600";
    case "increasing":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "decreasing":
      return <TrendingUp className="h-5 w-5 rotate-180" />;
    case "stable":
      return (
        <div className="flex h-5 w-5 items-center">
          <div className="h-0.5 w-5 bg-current" />
        </div>
      );
    case "increasing":
      return <TrendingUp className="h-5 w-5" />;
    default:
      return null;
  }
};

const getProtectiveColor = (strength: string) => {
  switch (strength) {
    case "high":
      return "bg-green-50 text-green-700 border-green-200";
    case "medium":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "low":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getNodesByType = (type: string) => causalNodes.filter((node) => node.type === type);

const getStatusIcon = (status: string) => {
  switch (status) {
    case "supported":
      return <Check className="h-4 w-4 text-green-600" />;
    case "contradicted":
      return <X className="h-4 w-4 text-red-600" />;
    case "partial":
      return <HelpCircle className="h-4 w-4 text-yellow-600" />;
    case "absent":
      return <X className="h-4 w-4 text-slate-400" />;
    default:
      return null;
  }
};

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case "high":
      return "bg-green-50 text-green-700 border-green-200";
    case "medium":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "low":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
  </div>
);

const Pill = ({ label, tone = "slate" }: { label: string; tone?: string }) => {
  const styles: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[tone] || styles.slate}`}>
      {label}
    </span>
  );
};

const ClinicalDashboardSamplePage = () => {
  const [activeTab, setActiveTab] = useState("narrative");

  return (
    <div className="min-h-screen rounded-3xl border border-slate-200/60 bg-slate-50 p-6">
      <div className="page-container w-full space-y-6">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Alex Morgan</h2>
                    <p className="text-sm text-slate-500">They/Them · 32 years old</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="h-4 w-4" />
                  Last session: Jan 28, 2026
                </div>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diagnoses</p>
                  <div className="flex flex-wrap gap-2">
                    <Pill label="Major Depressive Disorder" tone="blue" />
                    <Pill label="Generalized Anxiety Disorder (provisional)" tone="blue" />
                  </div>
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Therapy Stage</p>
                  <Pill label="Stabilization" tone="purple" />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Medications</p>
                  <div className="flex flex-wrap gap-2">
                    <Pill label="Sertraline 100mg" tone="slate" />
                    <Pill label="Buspirone 10mg (started)" tone="amber" />
                  </div>
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Risk Flags</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                      <AlertTriangle className="h-3 w-3" /> History of self-harm
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                      <AlertTriangle className="h-3 w-3" /> Passive ideation (present)
                    </span>
                  </div>
                </div>
              </div>

              <div className="my-6 h-px bg-slate-200" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unresolved Threats</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>Conflict with manager at work remains unresolved</li>
                  <li>Hasn’t reached HR yet; discussed</li>
                </ul>
              </div>
            </Card>

            <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-semibold text-slate-900">Emotional & Symptom Trajectories</h3>
                <p className="text-sm text-slate-500">
                  Change is rarely linear—this shows patterns, not scores
                </p>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      domain={[0, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />

                    {medicationChanges.map((change) => (
                      <ReferenceLine
                        key={change.date}
                        x={change.date}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        label={{
                          value: change.label,
                          position: "top",
                          fill: "#f59e0b",
                          fontSize: 11,
                        }}
                      />
                    ))}

                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#3b82f6" }}
                      activeDot={{ r: 5 }}
                      name="Mood"
                    />
                    <Line
                      type="monotone"
                      dataKey="anxiety"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#ef4444" }}
                      activeDot={{ r: 5 }}
                      name="Anxiety"
                    />
                    <Line
                      type="monotone"
                      dataKey="sleep"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#8b5cf6" }}
                      activeDot={{ r: 5 }}
                      name="Sleep Quality"
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                      name="Energy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h4 className="mb-3 text-sm text-slate-500">Notable Patterns</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-sm text-blue-900">Mood improving since Jan 15</p>
                    <p className="mt-1 text-xs text-blue-600">+2.3 points average</p>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                    <p className="text-sm text-red-900">Anxiety spike mid-January</p>
                    <p className="mt-1 text-xs text-red-600">Correlates with work deadline</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Tabs options={tabOptions} activeId={activeTab} onValueChange={setActiveTab} />

              {activeTab === "narrative" && (
                <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle
                    title="Narrative Intelligence"
                    subtitle="The patient’s voice, structured without losing meaning"
                  />
                  <div className="mb-6 mt-6 space-y-4">
                    {narrativeNotes.map((entry) => (
                      <div
                        key={entry.date}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-600">{entry.date}</span>
                          </div>
                          {entry.emotionalTone === "positive" && (
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          )}
                          {entry.emotionalTone === "negative" && (
                            <TrendingDown className="h-4 w-4 text-rose-600" />
                          )}
                        </div>
                        <p className="mb-3 text-sm text-slate-800">{entry.summary}</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.themes.map((theme) => (
                            <Badge
                              key={theme}
                              variant="secondary"
                              className="border-slate-300 bg-white text-slate-700"
                            >
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                    <div>
                      <h4 className="mb-3 text-sm text-slate-500">Repeated Metaphors</h4>
                      <ul className="space-y-2">
                        {repeatedMetaphors.map((metaphor) => (
                          <li
                            key={metaphor}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                            {metaphor}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm text-slate-500">Unresolved Narrative Threads</h4>
                      <ul className="space-y-2">
                        {unresolvedThreads.map((thread) => (
                          <li
                            key={thread}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                            {thread}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "causal" && (
                <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle
                    title="Causal Pattern Map"
                    subtitle="Understanding the cycles that maintain the problem"
                  />
                  <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                      {["trigger", "thought", "emotion", "behavior", "consequence"].map((type, index) => (
                        <div key={type} className="flex items-center gap-3">
                          <div className="min-w-[140px] space-y-2">
                            <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">{type}</div>
                            {getNodesByType(type).map((node) => (
                              <Badge
                                key={node.id}
                                className={`${causalTypeColors[node.type as keyof typeof causalTypeColors]} justify-center px-3 py-2`}
                              >
                                {node.label}
                              </Badge>
                            ))}
                          </div>
                          {index < 4 && (
                            <ArrowRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="mb-4 text-sm text-slate-700">Pattern Loops</h4>
                      <div className="space-y-3">
                        {causalConnections
                          .filter((connection) => connection.type === "reinforcing")
                          .map((connection, index) => {
                            const fromNode = causalNodes.find((node) => node.id === connection.from);
                            const toNode = causalNodes.find((node) => node.id === connection.to);
                            return (
                              <div
                                key={`${connection.from}-${connection.to}-${index}`}
                                className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3"
                              >
                                <Repeat className="h-4 w-4 flex-shrink-0 text-red-600" />
                                <div className="flex-1">
                                  <p className="text-sm text-red-900">
                                    <span className="font-medium">{fromNode?.label}</span>
                                    <ArrowRight className="mx-1 inline h-3 w-3" />
                                    <span className="font-medium">{toNode?.label}</span>
                                  </p>
                                  <p className="mt-1 text-xs text-red-600">
                                    {connection.strength === "strong" && "Strong reinforcing loop"}
                                    {connection.strength === "moderate" && "Moderate reinforcing loop"}
                                    {connection.strength === "weak" && "Weak reinforcing loop"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}

                        {causalConnections
                          .filter((connection) => connection.type === "protective")
                          .map((connection, index) => {
                            const fromNode = causalNodes.find((node) => node.id === connection.from);
                            const toNode = causalNodes.find((node) => node.id === connection.to);
                            return (
                              <div
                                key={`${connection.from}-${connection.to}-${index}`}
                                className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3"
                              >
                                <Repeat className="h-4 w-4 flex-shrink-0 text-green-600" />
                                <div className="flex-1">
                                  <p className="text-sm text-green-900">
                                    <span className="font-medium">{fromNode?.label}</span>
                                    <ArrowRight className="mx-1 inline h-3 w-3" />
                                    <span className="font-medium">{toNode?.label}</span>
                                  </p>
                                  <p className="mt-1 text-xs text-green-600">
                                    {connection.strength === "strong" && "Strong protective pattern"}
                                    {connection.strength === "moderate" && "Moderate protective pattern"}
                                    {connection.strength === "weak" && "Weak protective pattern"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === "diagnostic" && (
                <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle
                    title="Diagnostic Reasoning"
                    subtitle="Supporting clinical judgment, not replacing it"
                  />
                  <div className="mt-6 space-y-6">
                    {diagnosticProfiles.map((diagnosis) => (
                      <div
                        key={diagnosis.name}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <h4 className="text-base font-semibold text-slate-900">{diagnosis.name}</h4>
                          <Badge className={getConfidenceColor(diagnosis.confidence)}>
                            {diagnosis.confidence} confidence
                          </Badge>
                        </div>

                        <div className="mb-4 space-y-2">
                          {diagnosis.criteria.map((criterion) => (
                            <div
                              key={criterion.criterion}
                              className="flex items-start gap-3 text-sm"
                            >
                              {getStatusIcon(criterion.status)}
                              <span
                                className={
                                  criterion.status === "contradicted"
                                    ? "text-red-800"
                                    : criterion.status === "absent"
                                    ? "text-slate-400"
                                    : "text-slate-700"
                                }
                              >
                                {criterion.criterion}
                              </span>
                            </div>
                          ))}
                        </div>

                        {diagnosis.ruleOuts.length > 0 && (
                          <div className="border-t border-slate-200 pt-4">
                            <h5 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                              Rule-outs considered
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {diagnosis.ruleOuts.map((ruleOut) => (
                                <Badge key={ruleOut} variant="outline" className="text-slate-600">
                                  {ruleOut}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <h4 className="mb-3 text-sm text-slate-500">
                      What would increase diagnostic certainty?
                    </h4>
                    <ul className="space-y-2">
                      {diagnosticNextSteps.map((step) => (
                        <li
                          key={step}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              )}

              {activeTab === "treatment" && (
                <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <SectionTitle
                    title="Treatment Focus & Hypotheses"
                    subtitle="Scientific notebook, not checklist"
                  />
                  <div className="mt-6 space-y-6">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm text-slate-500">Active Treatment Goals</h4>
                      </div>
                      <div className="space-y-2">
                        {treatmentGoals.map((goal) => (
                          <div
                            key={goal.goal}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <span className="text-sm text-slate-800">{goal.goal}</span>
                            <Badge
                              className={
                                goal.status === "active"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : goal.status === "achieved"
                                  ? "border-green-200 bg-green-50 text-green-700"
                                  : "border-slate-200 bg-slate-100 text-slate-700"
                              }
                            >
                              {goal.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm text-slate-500">Therapist Hypotheses</h4>
                      </div>
                      <div className="space-y-3">
                        {treatmentHypotheses.map((hypothesis) => (
                          <div
                            key={hypothesis.hypothesis}
                            className="rounded-lg border border-purple-100 bg-purple-50 p-4"
                          >
                            <p className="mb-2 text-sm text-purple-900">
                              <span className="font-medium">If:</span> {hypothesis.hypothesis}
                            </p>
                            <p className="text-sm text-purple-700">
                              <span className="font-medium">Then:</span> {hypothesis.prediction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm text-slate-500">Interventions Tried</h4>
                      <div className="space-y-2">
                        {treatmentInterventions.map((intervention) => (
                          <div
                            key={intervention.intervention}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="mb-2 flex items-start gap-2">
                              {intervention.response === "effective" ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                              ) : intervention.response === "ineffective" ? (
                                <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                              ) : (
                                <HelpCircle className="mt-0.5 h-4 w-4 text-yellow-600" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm text-slate-800">{intervention.intervention}</p>
                                <p className="mt-1 text-xs text-slate-600">{intervention.notes}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {treatmentNotWorking.length > 0 && (
                      <div className="border-t border-slate-200 pt-6">
                        <h4 className="mb-3 text-sm text-slate-500">
                          What hasn't worked (often missing!)
                        </h4>
                        <ul className="space-y-2">
                          {treatmentNotWorking.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-sm text-slate-700"
                            >
                              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {activeTab === "strengths" && (
                <Card className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="mb-1 text-lg font-semibold text-slate-900">Strengths, Values & Identity Anchors</h3>
                    <p className="text-sm text-slate-600">
                      Who is this person outside the problem?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Heart className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-sm text-emerald-900">Core Values</h4>
                      </div>
                      <ul className="space-y-2">
                        {strengthsValues.map((value) => (
                          <li
                            key={value}
                            className="flex items-start gap-2 text-sm text-slate-800"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                            {value}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-600" />
                        <h4 className="text-sm text-emerald-900">Strengths & Assets</h4>
                      </div>
                      <ul className="space-y-2">
                        {strengthsAssets.map((strength) => (
                          <li
                            key={strength}
                            className="flex items-start gap-2 text-sm text-slate-800"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <h4 className="text-sm text-emerald-900">Meaningful Roles</h4>
                      </div>
                      <ul className="space-y-2">
                        {strengthsRoles.map((role) => (
                          <li
                            key={role}
                            className="flex items-start gap-2 text-sm text-slate-800"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500" />
                            {role}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <h4 className="text-sm text-emerald-900">Protective Factors</h4>
                      </div>
                      <ul className="space-y-2">
                        {strengthsProtectiveFactors.map((factor) => (
                          <li
                            key={factor}
                            className="flex items-start gap-2 text-sm text-slate-800"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
              <div className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-slate-900">Session-Ready Brief</h3>
                </div>
                <p className="text-sm text-slate-600">
                  What you need before knocking on the door
                </p>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm text-blue-900">Last Session Carry-Over</h4>
                <p className="rounded-lg border border-blue-100 bg-white/70 p-3 text-sm text-slate-800">
                  Alex committed to having a difficult conversation with their manager by this week. They were anxious but determined.
                </p>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm text-blue-900">Current Emotional Baseline</h4>
                <Badge className="border-blue-200 bg-blue-100 text-blue-800">
                  Cautiously optimistic, some anticipatory anxiety
                </Badge>
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm text-blue-900">Open Loops</h4>
                <ul className="space-y-2">
                  {[
                    "Did they have the conversation with their manager?",
                    "How is the new medication affecting them?",
                    "Follow up on sleep hygiene changes",
                  ].map((loop) => (
                    <li
                      key={loop}
                      className="flex items-start gap-2 rounded bg-white/50 p-2 text-sm text-slate-800"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      {loop}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-700" />
                  <h4 className="text-sm text-blue-900">Suggested Focal Points</h4>
                </div>
                <div className="space-y-2">
                  {[
                    "Process the work conversation (if it happened) or explore barriers (if it didn’t)",
                    "Assess medication response and side effects",
                    "Explore the “weekend recharge” that helped more energy",
                  ].map((point) => (
                    <div
                      key={point}
                      className="rounded-lg border border-blue-100 bg-white/70 p-3 text-sm text-slate-800"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-700" />
                  <h4 className="text-sm text-blue-900">Questions Worth Asking Today</h4>
                </div>
                <ul className="space-y-2">
                  {[
                    "What’s different this week compared to last week?",
                    "When you felt “lighter,” what was happening?",
                    "What would it look like if you gave yourself permission to not be perfect at work?",
                  ].map((question) => (
                    <li
                      key={question}
                      className="flex items-start gap-2 rounded bg-white/50 p-2 text-sm text-slate-800 italic"
                    >
                      <span className="flex-shrink-0 text-blue-500">•</span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="rounded-2xl border border-red-200/60 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-base font-semibold text-slate-900">Risk & Safety Monitor</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">Subtle, persistent, respectful</p>
              </div>

              <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Passive Risk Trend</span>
                  <div className={`flex items-center gap-2 ${getTrendColor(riskTrend)}`}>
                    {getTrendIcon(riskTrend)}
                    <span className="text-sm font-medium capitalize">{riskTrend}</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-600" />
                  <h4 className="text-sm text-slate-700">Protective Factor Strength</h4>
                </div>
                <Badge className={getProtectiveColor(protectiveFactorStrength)}>
                  {protectiveFactorStrength} strength
                </Badge>
              </div>

              {earlyWarningSignals.length > 0 && (
                <div className="mb-5">
                  <h4 className="mb-2 text-sm text-slate-700">Early Warning Signals</h4>
                  <div className="space-y-2">
                    {earlyWarningSignals.map((signal) => (
                      <div
                        key={signal}
                        className="flex items-start gap-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-900"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <div>
                    <h4 className="mb-1 text-sm text-blue-900">Safety Plan</h4>
                    <p className="text-sm text-blue-700">{safetyPlanStatus}</p>
                  </div>
                </div>
              </div>

              {recentCrisisEvents.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm text-slate-700">Recent Crisis History</h4>
                  <div className="space-y-3">
                    {recentCrisisEvents.map((crisis, index) => (
                      <div key={crisis.date} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          {index < recentCrisisEvents.length - 1 && (
                            <div className="mt-1 h-full w-0.5 bg-red-200" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="mb-1 text-xs text-slate-500">{crisis.date}</p>
                          <p className="text-sm text-slate-800">{crisis.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ClinicalDashboardSamplePage;
