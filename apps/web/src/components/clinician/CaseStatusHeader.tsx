import RiskBadge from "./RiskBadge";
import Sparkline from "../charts/Sparkline";
import type { RiskSignal } from "../../types/clinician";

/**
 * Props for CaseStatusHeader (Clinician-Facing).
 * Clinical precision required; summarizes risk and gating status.
 */
type CaseStatusHeaderProps = {
  name: string;
  lastEntryDate: string;
  riskSignal: RiskSignal | null;
  densitySeries: number[];
  newCriticalCount: number;
  unknownGateCount: number;
};

const CaseStatusHeader = ({
  name,
  lastEntryDate,
  riskSignal,
  densitySeries,
  newCriticalCount,
  unknownGateCount,
}: CaseStatusHeaderProps) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Case status</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{name}</h2>
          <p className="mt-1 text-sm text-slate-500">Last update: {lastEntryDate || "—"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Risk</p>
            <div className="mt-2">
              <RiskBadge risk={riskSignal} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">New critical</p>
            <p className="mt-1 text-lg font-semibold text-rose-600">{newCriticalCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Unknown gates</p>
            <p className="mt-1 text-lg font-semibold text-amber-600">{unknownGateCount}</p>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Data density (30 days)</p>
        <div className="mt-2 max-w-md">
          <Sparkline data={densitySeries} />
        </div>
      </div>
    </div>
  );
};

export default CaseStatusHeader;
