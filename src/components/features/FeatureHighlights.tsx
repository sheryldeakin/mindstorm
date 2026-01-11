const features = [
  {
    title: "Emotion-aware journaling",
    description: "Soft guidance nudges you to label feelings, context, and body cues without judgment.",
  },
  {
    title: "Longitudinal tracking",
    description: "Glassmorphism dashboards reveal trends over weeks, not just a single entry.",
  },
  {
    title: "Session-ready summaries",
    description: "Auto condensed briefs keep therapy on-track and evidence-based.",
  },
  {
    title: "Insight studio",
    description: "Mini-cards highlight correlations like sleep vs. irritability or work vs. anxiety.",
  },
];

const FeatureHighlights = () => (
  <section id="features" className="mx-auto max-w-6xl px-6 py-20">
    <div className="grid gap-8 md:grid-cols-2">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="rounded-3xl border border-brand/15 bg-white p-6 shadow-lg shadow-brand/10"
        >
          <h3 className="text-xl font-semibold text-brand">{feature.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export default FeatureHighlights;
