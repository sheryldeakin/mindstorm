import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import DifferentialList from "../components/clinician/DifferentialList";
import useDiagnosticLogic from "../hooks/useDiagnosticLogic";
import { appendComputedEvidenceToEntries } from "@mindstorm/criteria-graph";
import useCompareGateRows from "../hooks/useCompareGateRows";
import { apiFetch } from "../lib/apiClient";
import type { CaseEntry, ClinicianCase } from "../types/clinician";
import { buildCoverageMetrics, buildEvidenceSummary } from "../lib/clinicianMetrics";

const ClinicianDifferentialPage = () => {
  const [cases, setCases] = useState<ClinicianCase[]>([]);
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCase = searchParams.get("caseId") || "";

  useEffect(() => {
    let active = true;
    apiFetch<{ cases: ClinicianCase[] }>("/clinician/cases")
      .then((response) => {
        if (!active) return;
        setCases(response.cases || []);
        if (!selectedCase && response.cases?.length) {
          setSearchParams({ caseId: response.cases[0].userId });
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load cases.");
      });
    return () => {
      active = false;
    };
  }, [selectedCase, setSearchParams]);

  useEffect(() => {
    if (!selectedCase) return;
    let active = true;
    setLoading(true);
    apiFetch<{ entries: CaseEntry[] }>(`/clinician/cases/${selectedCase}/entries`)
      .then((response) => {
        if (!active) return;
        setEntries(appendComputedEvidenceToEntries(response.entries || []));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load case.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCase]);

  const coverage = useMemo(() => buildCoverageMetrics(entries), [entries]);
  const evidenceSummary = useMemo(() => buildEvidenceSummary(entries), [entries]);
  const { getStatusForLabels } = useDiagnosticLogic(entries, { patientId: selectedCase });

  const candidates = useMemo(() => {
    const mdd = coverage.find((item) => item.label.startsWith("MDD"));
    const gad = coverage.find((item) => item.label.startsWith("GAD"));
    const ptsd = coverage.find((item) => item.label.startsWith("PTSD"));
    const maniaStatus = getStatusForLabels(["SYMPTOM_MANIA"]);
    return [
      {
        id: "mdd",
        label: "Major Depressive Disorder",
        current: mdd?.current || 0,
        lifetime: mdd?.lifetime || 0,
        max: mdd?.max || 9,
        blocked: maniaStatus === "MET",
        blockedReason: maniaStatus === "MET" ? "Blocked by manic history signal." : undefined,
      },
      {
        id: "gad",
        label: "Generalized Anxiety",
        current: gad?.current || 0,
        lifetime: gad?.lifetime || 0,
        max: gad?.max || 6,
      },
      {
        id: "ptsd",
        label: "Trauma-related",
        current: ptsd?.current || 0,
        lifetime: ptsd?.lifetime || 0,
        max: ptsd?.max || 7,
      },
    ];
  }, [coverage, getStatusForLabels]);

  const openQuestions = [
    evidenceSummary.SYMPTOM_TRAUMA ? "Clarify trauma exposure timeline." : null,
    evidenceSummary.SYMPTOM_PSYCHOSIS ? "Rule out psychotic features and content." : null,
    evidenceSummary.CONTEXT_SUBSTANCE ? "Check substance or medication attribution." : null,
  ].filter(Boolean);

  const compareCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.current >= 2),
    [candidates],
  );
  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");

  useEffect(() => {
    setCompareLeft(compareCandidates[0]?.id || "");
    setCompareRight(compareCandidates[1]?.id || "");
  }, [compareCandidates]);
  const compareRows = useCompareGateRows(entries, compareLeft, compareRight, selectedCase);

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        eyebrow="Clinician"
        title="Differential considerations (ranked by coverage)"
        description="Compare criteria alignment without implying a diagnosis."
        actions={(
          <select
            className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600"
            value={selectedCase}
            onChange={(event) => setSearchParams({ caseId: event.target.value })}
          >
            <option value="">Select case</option>
            {cases.map((item) => (
              <option key={item.userId} value={item.userId}>
                {item.name || item.email || item.userId}
              </option>
            ))}
          </select>
        )}
      />

      {loading ? (
        <Card className="p-6 text-sm text-slate-500">Loading differential…</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-rose-600">{error}</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Primary considerations</h3>
            <p className="mt-1 text-sm text-slate-500">
              Coverage reflects recent evidence signals (last 14 days).
            </p>
            <div className="mt-4">
              <DifferentialList items={candidates} />
            </div>
          </Card>
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold">Clarify gaps</h3>
              <p className="mt-1 text-sm text-slate-500">Areas to clarify before finalizing coverage.</p>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-slate-600">
                {openQuestions.length ? (
                  openQuestions.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>No additional questions flagged.</li>
                )}
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold">Compare criteria gates</h3>
              <p className="mt-1 text-sm text-slate-500">
                Compare gating logic across candidates with at least 2 criteria met.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600"
                  value={compareLeft}
                  onChange={(event) => setCompareLeft(event.target.value)}
                >
                  <option value="">Select first</option>
                  {compareCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600"
                  value={compareRight}
                  onChange={(event) => setCompareRight(event.target.value)}
                >
                  <option value="">Select second</option>
                  {compareCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 overflow-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="pb-2">Gate</th>
                      <th className="pb-2">{compareRows.leftLabel}</th>
                      <th className="pb-2">{compareRows.rightLabel}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {compareRows.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 text-slate-600">{row.label}</td>
                        <td className="py-2 text-slate-700">{row.leftStatus}</td>
                        <td className="py-2 text-slate-700">{row.rightStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicianDifferentialPage;
