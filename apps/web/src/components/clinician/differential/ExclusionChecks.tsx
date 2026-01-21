import { CheckCircle2, MinusCircle, HelpCircle } from "lucide-react";
import type { ExclusionCheck } from "./types";
import StatusDecisionMenu from "../StatusDecisionMenu";

/**
 * Props for ExclusionChecks (Clinician-Facing).
 * Clinical precision required; displays rule-out checks.
 */
type ExclusionChecksProps = {
  checks: ExclusionCheck[];
  onOverrideChange?: (
    nodeId: string,
    status: "MET" | "EXCLUDED" | "UNKNOWN" | null,
    note?: string,
  ) => void;
};

const ExclusionChecks = ({ checks, onOverrideChange }: ExclusionChecksProps) => {
  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div key={check.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          {check.state === "confirmed" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
          ) : check.state === "unknown" ? (
            <HelpCircle className="mt-0.5 h-5 w-5 text-amber-500" />
          ) : (
            <MinusCircle className="mt-0.5 h-5 w-5 text-slate-400" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">{check.label}</p>
            {check.note ? <p className="mt-1 text-xs text-slate-500">{check.note}</p> : null}
          </div>
          {onOverrideChange ? (
            <StatusDecisionMenu
              autoStatus={check.autoStatus || "UNKNOWN"}
              overrideStatus={check.overrideStatus ?? null}
              onUpdate={(status, note) => onOverrideChange(check.id, status, note)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default ExclusionChecks;
