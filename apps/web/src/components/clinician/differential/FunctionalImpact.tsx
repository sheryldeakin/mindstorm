import type { FunctionalImpactDomain } from "./types";
import StatusDecisionMenu from "../StatusDecisionMenu";

/**
 * Props for FunctionalImpact (Clinician-Facing).
 * Clinical precision required; shows functional impact domains.
 */
type FunctionalImpactProps = {
  domains: FunctionalImpactDomain[];
  onOverrideChange?: (
    nodeId: string,
    status: "MET" | "EXCLUDED" | "UNKNOWN" | null,
    note?: string,
  ) => void;
};

const FunctionalImpact = ({ domains, onOverrideChange }: FunctionalImpactProps) => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {domains.map((domain) => (
        <div key={domain.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">{domain.domain}</span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{domain.level === "none" ? "Unknown — ask patient" : domain.level}</span>
              {onOverrideChange ? (
                <StatusDecisionMenu
                  autoStatus={domain.autoStatus || "UNKNOWN"}
                  overrideStatus={domain.overrideStatus ?? null}
                  onUpdate={(status, note) => onOverrideChange(domain.id, status, note)}
                />
              ) : null}
            </div>
          </div>
          {domain.note ? <p className="mt-2 text-xs text-slate-500">{domain.note}</p> : null}
        </div>
      ))}
    </div>
  );
};

export default FunctionalImpact;
