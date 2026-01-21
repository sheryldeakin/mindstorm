import { CheckCircle2, MinusCircle, HelpCircle } from "lucide-react";
import type { ExclusionCheck } from "./types";

/**
 * Props for ExclusionChecks (Clinician-Facing).
 * Clinical precision required; displays rule-out checks.
 */
type ExclusionChecksProps = {
  checks: ExclusionCheck[];
};

const ExclusionChecks = ({ checks }: ExclusionChecksProps) => {
  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div key={check.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          {check.state === "confirmed" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
          ) : check.state === "unknown" ? (
            <HelpCircle className="mt-0.5 h-5 w-5 text-amber-500" />
          ) : (
            <MinusCircle className="mt-0.5 h-5 w-5 text-slate-400" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-800">{check.label}</p>
            {check.note ? <p className="mt-1 text-xs text-slate-500">{check.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExclusionChecks;
