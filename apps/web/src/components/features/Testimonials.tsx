const testimonials = [
  {
    quote:
      "MindStorm gave us a calm record between my therapy sessions. I show up grounded, not scrambling to remember.",
    author: "Recovering perfectionist",
  },
  {
    quote:
      "As a clinician I finally see longitudinal data without extra admin. Clients love how gentle it feels.",
    author: "Trauma-focused therapist",
  },
];

const Testimonials = () => (
  <section id="stories" className="mx-auto max-w-6xl px-6 py-20">
    <div className="grid gap-6 md:grid-cols-2">
      {testimonials.map((testimonial) => (
        <div
          key={testimonial.author}
          className="ms-card ms-elev-2 rounded-3xl p-6 text-slate-700"
        >
          <p className="text-lg font-medium text-brand">"{testimonial.quote}"</p>
          <p className="mt-4 text-sm text-brand/70">- {testimonial.author}</p>
        </div>
      ))}
    </div>
  </section>
);

export default Testimonials;
