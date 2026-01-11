import { motion } from "framer-motion";
import HeroMockup from "../components/features/HeroMockup";
import FeatureHighlights from "../components/features/FeatureHighlights";
import HowItWorks from "../components/features/HowItWorks";
import Testimonials from "../components/features/Testimonials";
import UseCaseGrid from "../components/features/UseCaseGrid";
import Button from "../components/ui/Button";
import { Link } from "react-router-dom";
import heroLogo from "/Mindstorm Logo.png";

const HomePage = () => (
  <main className="bg-gradient-to-b from-white via-white to-slate-50 text-slate-900">
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 pb-20 pt-16 md:flex-row">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="w-full md:w-1/2"
      >
        <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Mindful journaling OS</p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-brand md:text-5xl">
          "Where your mind becomes the solution, not the storm."
        </h1>
        <p className="mt-6 text-lg text-brand/80">
          MindStorm helps you track emotions, triggers, and patterns over time so you and your therapist can see the whole
          story - not just one session.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/login">
            <Button size="lg">Start free journal</Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="secondary" size="lg">
              See how it works
            </Button>
          </a>
        </div>
      </motion.div>
      <div className="w-full md:w-1/2 flex flex-col items-center gap-6">
        <img src={heroLogo} alt="MindStorm logo" className="h-32 w-auto md:h-48" />
        <HeroMockup />
      </div>
    </section>
    <HowItWorks />
    <FeatureHighlights />
    <UseCaseGrid />
    <Testimonials />
  </main>
);

export default HomePage;
