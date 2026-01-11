import { motion } from "framer-motion";
import { sampleEntries, insightCards } from "../../lib/mockData";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { Card } from "../ui/Card";
import Badge from "../ui/Badge";

const HeroMockup = () => {
  const entry = sampleEntries[0];
  const prefersReducedMotion = usePrefersReducedMotion();

  const animation = prefersReducedMotion
    ? { style: {} }
    : {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.8, ease: "easeOut", delay: 0.2 },
        viewport: { once: true },
      };

  return (
    <div className="relative">
      <div className="absolute -left-6 -right-6 top-10 mx-auto h-72 max-w-3xl rounded-[40px] bg-hero-glow blur-3xl" />
      <motion.div {...animation}>
        <Card className="relative bg-gradient-to-br from-brand/5 via-white to-white text-slate-900 shadow-glow">
          <div className="flex flex-col gap-6 p-8 text-slate-900">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-brand/60">{entry.date}</p>
              <h3 className="mt-2 text-2xl font-semibold text-brand">{entry.title}</h3>
              <p className="mt-2 text-slate-600">{entry.summary}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {entry.emotions.map((emotion) => (
                <Badge key={emotion.label} tone={emotion.tone}>
                  {emotion.label} - {emotion.intensity}%
                </Badge>
              ))}
            </div>
            <div className="rounded-3xl border border-brand/15 bg-white/90 p-4 shadow-inner">
              <p className="text-sm font-semibold text-slate-800">Pattern flash</p>
              <p className="text-sm text-slate-600">
                Emotion spikes around <span className="font-semibold text-slate-900">work stand-ups (3x/week)</span>.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {insightCards.slice(0, 3).map((insight) => (
          <Card key={insight.id} className="border-brand/10 bg-white text-slate-900 shadow-sm">
            <div className="p-5">
              <p className="text-sm font-semibold">{insight.title}</p>
              <p className="mt-1 text-sm text-slate-500">{insight.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HeroMockup;
