import MindMapNav from "./MindMapNav";

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
  return (
    <div className="relative flex h-[640px] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70">
      <div className="absolute inset-0 z-0">
        <MindMapNav
          contextItems={contextItems}
          symptomItems={symptomItems}
          impactItems={impactItems}
          onSelectMetric={onSelectMetric}
          onBack={() => {}}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center pointer-events-none" />
    </div>
  );
};

export default IntroSequence;
