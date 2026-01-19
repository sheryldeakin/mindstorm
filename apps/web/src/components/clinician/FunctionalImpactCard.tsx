import { Card } from "../ui/Card";
import type { CaseEntry, EvidenceUnit } from "../../types/clinician";

type ImpactDomain = "Work/School" | "Social" | "Self-Care" | "Safety";

type ImpactItem = {
  domain: ImpactDomain;
  count: number;
  severity: "None" | "Mild" | "Moderate" | "High";
  examples: Array<{ span: string; dateISO: string }>;
};

const DOMAIN_RULES: Record<ImpactDomain, RegExp> = {
  "Work/School": /(work|job|boss|office|deadline|school|class|assignment|meeting|shift)/i,
  Social: /(friend|friends|partner|family|relationship|social|text|call|dinner|people)/i,
  "Self-Care": /(shower|bath|laundry|brush|eat|cooking|clean|hygiene|bed|sleep)/i,
  Safety: /(harm|hurt|unsafe|danger|suicid|self-harm|kill)/i,
};

const toSeverity = (count: number): ImpactItem["severity"] => {
  if (count === 0) return "None";
  if (count === 1) return "Mild";
  if (count <= 3) return "Moderate";
  return "High";
};

const buildImpactSummary = (entries: CaseEntry[]): ImpactItem[] => {
  const evidenceItems: Array<EvidenceUnit & { dateISO: string }> = entries.flatMap((entry) =>
    (entry.evidenceUnits || [])
      .filter((unit) => unit.label === "IMPAIRMENT")
      .map((unit) => ({ ...unit, dateISO: entry.dateISO })),
  );
  const hasAnyEvidence = evidenceItems.length > 0;

  return (Object.keys(DOMAIN_RULES) as ImpactDomain[]).map((domain) => {
    const regex = DOMAIN_RULES[domain];
    const matches = evidenceItems.filter((item) => regex.test(item.span));
    return {
      domain,
      count: matches.length,
      severity: hasAnyEvidence ? toSeverity(matches.length) : "None",
      examples: matches.slice(0, 2).map((item) => ({ span: item.span, dateISO: item.dateISO })),
    };
  });
};

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
