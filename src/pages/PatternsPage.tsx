import { useState } from "react";
import InsightCard from "../components/features/InsightCard";
import PatternHighlights from "../components/features/PatternHighlights";
import Tabs from "../components/ui/Tabs";
import { Card } from "../components/ui/Card";
import { insightCards } from "../lib/mockData";

const emotionFrequency = [
  { label: "Calm", value: 68 },
  { label: "Anxiety", value: 52 },
  { label: "Irritation", value: 34 },
  { label: "Hopeful", value: 58 },
];

const triggerBreakdown = [
  { label: "Workload shifts", percent: 34 },
  { label: "Social plans", percent: 22 },
  { label: "Sleep debt", percent: 18 },
  { label: "Unknown", percent: 26 },
];

const tabOptions = [
  { id: "week", label: "This week" },
  { id: "month", label: "30 days" },
  { id: "quarter", label: "90 days" },
];

const PatternsPage = () => {
  const [range, setRange] = useState("week");

  return (
    <div className="space-y-10 text-slate-900">
      <section className="rounded-3xl border border-brand/15 bg-white p-6 shadow-lg shadow-brand/10">
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Patterns & insights</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-semibold">Your nervous system trends</h2>
          <Tabs options={tabOptions} activeId={range} onValueChange={setRange} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Soft gradients call out when emotions spike, soften, or correlate with habits over the last {range}.
        </p>
        <div className="mt-8">
          <PatternHighlights />
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-xl font-semibold">Emotion frequency</h3>
          <div className="mt-6 space-y-4">
            {emotionFrequency.map((emotion) => (
              <div key={emotion.label}>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{emotion.label}</span>
                  <span>{emotion.value}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                    style={{ width: `${emotion.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border-brand/15 bg-white p-6">
          <h3 className="text-xl font-semibold">Trigger categories</h3>
          <div className="mt-6 space-y-4">
            {triggerBreakdown.map((trigger) => (
              <div key={trigger.label} className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{trigger.label}</p>
                <p className="text-sm text-slate-900">{trigger.percent}%</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {insightCards.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </section>
    </div>
  );
};

export default PatternsPage;
