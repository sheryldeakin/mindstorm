import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Activity, ArrowRight, Brain, Shield, Sparkles, Share2 } from "lucide-react";

import HomeAvatarScene, { type HomeAvatarDomain } from "../components/avatar/HomeAvatarScene";
import HeroMockup from "../components/features/HeroMockup";
import NeuralCircuit, { type NeuralCircuitEdge, type NeuralCircuitNode } from "../components/features/NeuralCircuit";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";

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

const HomePage = () => {
  const [activeDomain, setActiveDomain] = useState<HomeAvatarDomain>("root");
  const { scrollYProgress } = useScroll();

  const yHero = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

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
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-[#f8fafc] text-slate-900">
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

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl">
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
            <h2 className="mb-6 text-4xl font-bold text-slate-900">
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

      <section className="relative bg-white/50 px-6 py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Brain size={24} />
            </div>
            <h2 className="mb-6 text-4xl font-bold text-slate-900">Explore your neural circuit.</h2>
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
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
            <Share2 size={32} />
          </div>

          <h2 className="mb-8 text-4xl font-bold text-slate-900 md:text-5xl">
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
          <h2 className="mb-6 text-3xl font-bold text-slate-900">Start making sense of the storm.</h2>
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
  );
};

export default HomePage;
