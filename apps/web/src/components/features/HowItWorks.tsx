const steps = [
  {
    title: "Capture the storm",
    description: "Guided prompts help you record feelings, context, and body cues in minutes.",
  },
  {
    title: "Detect the pattern",
    description: "MindStorm surfaces recurring emotions, triggers, and regulation tactics.",
  },
  {
    title: "Share calm clarity",
    description: "Session-ready briefs mean you and your therapist see the whole story.",
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="page-container px-6 py-20">
    <p className="text-sm uppercase tracking-[0.4em] text-brandLight">How it works</p>
    <h2 className="mt-4 text-3xl font-semibold text-brand md:text-4xl">
      Designed for calm, session-ready reflections.
    </h2>
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="ms-card ms-elev-2 rounded-3xl p-6"
        >
          <p className="text-sm font-semibold text-brandLight">Step 0{index + 1}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{step.title}</h3>
          <p className="mt-3 text-sm text-slate-500">{step.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;
