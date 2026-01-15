import type { HomePatternCard } from "../../types/home";
import PatternCard from "../patterns/PatternCard";

interface PatternCardGridProps {
  patterns: HomePatternCard[];
}

const PatternCardGrid = ({ patterns }: PatternCardGridProps) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {patterns.map((pattern) => (
      <PatternCard
        key={pattern.id}
        title={pattern.title}
        description={pattern.description}
        trend={pattern.trend}
        confidence={pattern.confidence}
        series={pattern.sparkline}
      />
    ))}
  </div>
);

export default PatternCardGrid;
