import type { FunctionalImpactDomain } from "./types";

type FunctionalImpactProps = {
  domains: FunctionalImpactDomain[];
};

const FunctionalImpact = ({ domains }: FunctionalImpactProps) => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {domains.map((domain) => (
        <div key={domain.domain} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">{domain.domain}</span>
            <span className="text-xs text-slate-500">
              {domain.level === "none" ? "Unknown — ask patient" : domain.level}
            </span>
          </div>
          {domain.note ? <p className="mt-2 text-xs text-slate-500">{domain.note}</p> : null}
        </div>
      ))}
    </div>
  );
};

export default FunctionalImpact;
