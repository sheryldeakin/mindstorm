import DiagnosisCard from "./DiagnosisCard";
import type { DifferentialDiagnosis } from "./types";

/**
 * Props for DifferentialOverview (Clinician-Facing).
 * Clinical precision required; lists diagnostic candidates.
 */
type DifferentialOverviewProps = {
  diagnoses: DifferentialDiagnosis[];
  selectedKey: DifferentialDiagnosis["key"];
  pinnedKeys: DifferentialDiagnosis["key"][];
  onSelect: (key: DifferentialDiagnosis["key"]) => void;
  onTogglePin: (key: DifferentialDiagnosis["key"]) => void;
};

const DifferentialOverview = ({
  diagnoses,
  selectedKey,
  pinnedKeys,
  onSelect,
  onTogglePin,
}: DifferentialOverviewProps) => {
  return (
    <div className="space-y-4">
      {diagnoses.map((diagnosis) => (
        <DiagnosisCard
          key={diagnosis.key}
          data={diagnosis.card}
          selected={diagnosis.key === selectedKey}
          pinned={pinnedKeys.includes(diagnosis.key)}
          onSelect={onSelect}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
};

export default DifferentialOverview;
