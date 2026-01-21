import { AlertTriangle } from "lucide-react";
import type { DiagnosisKey } from "./types";

/**
 * Props for ComorbidityWarnings (Clinician-Facing).
 * Clinical precision required; shows diagnostic exclusion warnings.
 */
type ComorbidityWarningsProps = {
  selectedDiagnoses: DiagnosisKey[];
  manicHistory: boolean;
};

const ComorbidityWarnings = ({ selectedDiagnoses, manicHistory }: ComorbidityWarningsProps) => {
  const warnings: Array<{ title: string; text: string }> = [];

  if (selectedDiagnoses.includes("mdd") && manicHistory) {
    warnings.push({
      title: "Diagnostic exclusion",
      text: "History of mania/hypomania excludes Major Depressive Disorder. Consider bipolar spectrum criteria.",
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-3">
      {warnings.map((warning, index) => (
        <div
          key={`${warning.title}-${index}`}
          className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <span className="font-semibold">{warning.title}:</span> {warning.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComorbidityWarnings;
