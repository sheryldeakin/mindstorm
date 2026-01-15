const useCases = [
  {
    title: "Individuals",
    description: "Capture nuanced emotions daily and keep your nervous system top-of-mind.",
  },
  {
    title: "Therapists",
    description: "See patterns between sessions and arrive with summaries ready to explore.",
  },
  {
    title: "Researchers",
    description: "Gather anonymous, high-fidelity data on mood, environment, and coping habits.",
  },
];

const UseCaseGrid = () => (
  <section id="use-cases" className="mx-auto max-w-6xl px-6 py-20">
    <div className="rounded-[40px] border border-brand/15 bg-white p-10 shadow-lg shadow-brand/10">
      <div className="grid gap-10 md:grid-cols-3">
        {useCases.map((useCase) => (
          <div key={useCase.title}>
            <p className="text-sm uppercase tracking-[0.4em] text-brand/60">{useCase.title}</p>
            <p className="mt-3 text-lg text-brand/80">{useCase.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default UseCaseGrid;
