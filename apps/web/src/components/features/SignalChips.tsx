import type { EvidenceUnit } from "../../types/journal";
import Chip from "../ui/Chip";
import { usePatientTranslation } from "../../hooks/usePatientTranslation";

/**
 * Props for SignalChips (Patient-Facing).
 * Uses patient-friendly labels derived from evidence units.
 */
interface SignalChipsProps {
  evidenceUnits: EvidenceUnit[];
  maxChips?: number;
}

const orderForLabel = (label: string) => {
  if (label.startsWith("SYMPTOM_")) return 0;
  if (label.startsWith("IMPACT_")) return 1;
  if (label.startsWith("CONTEXT_")) return 2;
  return 3;
};

const SignalChips = ({ evidenceUnits, maxChips = 4 }: SignalChipsProps) => {
  const { getPatientLabel } = usePatientTranslation();
  const labels: string[] = [];

  const presentUnits = evidenceUnits.filter((unit) => {
    const polarity = unit.attributes?.polarity;
    return polarity ? polarity === "PRESENT" : true;
  });

  presentUnits
    .filter((unit) => unit.label && !unit.label.startsWith("DX_") && !unit.label.startsWith("THRESHOLD"))
    .sort((a, b) => orderForLabel(a.label) - orderForLabel(b.label))
    .forEach((unit) => {
      const mapped = getPatientLabel(unit.label);
      if (!labels.includes(mapped)) labels.push(mapped);
    });

  return (
    <div className="flex flex-wrap gap-3">
      {labels.slice(0, maxChips).map((label) => (
        <Chip key={label}>{label}</Chip>
      ))}
    </div>
  );
};

export default SignalChips;
