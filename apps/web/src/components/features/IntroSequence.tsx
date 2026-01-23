import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MindMapNav from "./MindMapNav";
import MindstormFigure from "./MindstormFigure";

type DomainKey = "root" | "context" | "symptom" | "impact";

type DomainItem = {
  id: string;
  label: string;
  subtext?: string;
};

type IntroSequenceProps = {
  contextItems: DomainItem[];
  symptomItems: DomainItem[];
  impactItems: DomainItem[];
  onSelectMetric: (domain: Exclude<DomainKey, "root">, item: DomainItem) => void;
};

const IntroSequence = ({ contextItems, symptomItems, impactItems, onSelectMetric }: IntroSequenceProps) => {
  const [hasZoomed, setHasZoomed] = useState(false);

  return (
    <div className="relative flex h-[640px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70">
      <AnimatePresence>
        {!hasZoomed && (
          <motion.div
            className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center"
            onClick={() => setHasZoomed(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <div className="flex flex-col items-center gap-3">
              <MindstormFigure />
              <motion.div
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Enter
              </motion.div>
            </div>

            <motion.p
              className="mt-8 text-sm font-medium text-slate-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Tap to explore your mind
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {hasZoomed && (
        <motion.div
          layoutId="brain-container"
          className="relative h-full w-full bg-white"
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="h-full w-full"
          >
            <MindMapNav
              contextItems={contextItems}
              symptomItems={symptomItems}
              impactItems={impactItems}
              onSelectMetric={onSelectMetric}
              onBack={() => setHasZoomed(false)}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default IntroSequence;
