import { Card } from "../ui/Card";
import type { CaseEntry, EvidenceUnit } from "../../types/clinician";

type ImpactDomain = "Work/School" | "Social" | "Self-Care" | "Safety";

type ImpactItem = {
  domain: ImpactDomain;
  count: number;
  severity: "None" | "Mild" | "Moderate" | "High";
  examples: Array<{ span: string; dateISO: string }>;
};

const LABEL_MAP: Record<string, ImpactDomain> = {
  IMPACT_WORK: "Work/School",
  IMPACT_SOCIAL: "Social",
  IMPACT_SELF_CARE: "Self-Care",
  IMPACT_SAFETY: "Safety",
};

const toSeverity = (count: number): ImpactItem["severity"] => {
  if (count === 0) return "None";
  if (count === 1) return "Mild";
  if (count <= 3) return "Moderate";
  return "High";
};

const buildImpactSummary = (entries: CaseEntry[]): ImpactItem[] => {
  const units: Array<EvidenceUnit & { dateISO: string }> = entries.flatMap((entry) =>
    (entry.evidenceUnits || []).map((unit) => ({ ...unit, dateISO: entry.dateISO })),
  );
  const labeledUnits = units.filter(
    (unit) =>
      unit.label in LABEL_MAP &&
      unit.attributes?.polarity !== "ABSENT",
  );
  const hasAnyEvidence = labeledUnits.length > 0;

  return Object.values(LABEL_MAP).map((domain) => {
    const matches = labeledUnits.filter((unit) => LABEL_MAP[unit.label] === domain);
    return {
      domain,
      count: matches.length,
      severity: hasAnyEvidence ? toSeverity(matches.length) : "None",
      examples: matches.slice(0, 2).map((item) => ({ span: item.span, dateISO: item.dateISO })),
    };
  });
};

/**
 * Props for FunctionalImpactCard (Clinician-Facing).
 * Clinical precision required; uses IMPACT_* evidence labels.
 */
type FunctionalImpactCardProps = {
  entries: CaseEntry[];
};

const FunctionalImpactCard = ({ entries }: FunctionalImpactCardProps) => {
  const summary = buildImpactSummary(entries);
  const hasAnyEvidence = summary.some((item) => item.count > 0);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold">Functional impact</h3>
      <p className="mt-1 text-sm text-slate-500">
        Domains reflect impairment signals captured in recent entries.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {summary.map((item) => (
          <div key={item.domain} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">{item.domain}</span>
              <span className="text-xs text-slate-500">
                {hasAnyEvidence ? item.severity : "Unknown"}
              </span>
            </div>
            {item.examples.length ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {item.examples.map((example, idx) => (
                  <li key={`${item.domain}-${idx}`}>
                    {example.dateISO}: “{example.span}”
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                {hasAnyEvidence ? "No impairment evidence captured." : "Unknown — ask patient."}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FunctionalImpactCard;
