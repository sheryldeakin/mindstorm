import DiagnosisCard from "./DiagnosisCard";
import type { DifferentialDiagnosis } from "./types";

type DifferentialOverviewProps = {
  diagnoses: DifferentialDiagnosis[];
  selectedKey: DifferentialDiagnosis["key"];
  onSelect: (key: DifferentialDiagnosis["key"]) => void;
};

const DifferentialOverview = ({ diagnoses, selectedKey, onSelect }: DifferentialOverviewProps) => {
  return (
    <div className="space-y-4">
      {diagnoses.map((diagnosis) => (
        <DiagnosisCard
          key={diagnosis.key}
          data={diagnosis.card}
          selected={diagnosis.key === selectedKey}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default DifferentialOverview;
