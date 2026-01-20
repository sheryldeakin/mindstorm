import type { DiagnosisKey } from "./types";

type ComorbidityViewProps = {
  pinnedKeys: DiagnosisKey[];
};

const ComorbidityView = ({ pinnedKeys }: ComorbidityViewProps) => {
  if (!pinnedKeys.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500">
        Pin diagnoses to track comorbidity checks.
      </div>
    );
  }

  const hasMdd = pinnedKeys.includes("mdd");
  const hasSmidd = pinnedKeys.includes("smidd");
  const warnings: string[] = [];

  if (hasMdd && hasSmidd) {
    warnings.push(
      "Comorbidity check: verify symptoms persist >1 month after substance cessation to rule out substance-induced depression.",
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Pinned diagnoses</p>
      <ul className="mt-2 space-y-1">
        {pinnedKeys.map((key) => (
          <li key={key} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
            {key.toUpperCase()}
          </li>
        ))}
      </ul>
      {warnings.length ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ComorbidityView;
