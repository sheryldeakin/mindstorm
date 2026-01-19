import { AlertTriangle, Eye } from "lucide-react";
import type { RiskSignal } from "../../types/clinician";

type RiskBadgeProps = {
  risk: RiskSignal | null;
};

const RiskBadge = ({ risk }: RiskBadgeProps) => {
  if (!risk?.detected) {
    return <span className="text-xs text-slate-400">None</span>;
  }

  if (risk.level === "high") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 animate-pulse"
        title={risk.type || "Active risk signal detected"}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Active risk
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
      title={risk.type || "Passive ideation detected"}
    >
      <Eye className="h-3.5 w-3.5" />
      Monitor
    </span>
  );
};

export default RiskBadge;
