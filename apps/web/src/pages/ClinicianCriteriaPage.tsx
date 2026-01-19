import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import CriteriaCoverageBar from "../components/clinician/CriteriaCoverageBar";
import SymptomHeatmap from "../components/clinician/SymptomHeatmap";
import { Card } from "../components/ui/Card";
import { apiFetch } from "../lib/apiClient";
import type { CaseEntry, ClinicianCase } from "../types/clinician";
import { buildCoverageMetrics } from "../lib/clinicianMetrics";

const ClinicianCriteriaPage = () => {
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
    apiFetch<{ entries: CaseEntry[]; user: { name: string } }>(`/clinician/cases/${selectedCase}/entries`)
      .then((response) => {
        if (!active) return;
        setEntries(response.entries || []);
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

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        eyebrow="Clinician"
        title="Criteria coverage"
        description="Coverage view for criteria-like signal clusters."
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
        <Card className="p-6 text-sm text-slate-500">Loading coverage…</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-rose-600">{error}</Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {coverage.map((item) => (
              <CriteriaCoverageBar
                key={item.label}
                label={item.label}
                current={item.current}
                lifetime={item.lifetime}
                max={item.max}
                threshold={item.threshold}
              />
            ))}
          </div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Signal density heatmap</h3>
            <p className="mt-1 text-sm text-slate-500">
              Daily cluster signals, grouped weekly if the timeline is long.
            </p>
            <div className="mt-4">
              <SymptomHeatmap entries={entries} groupByWeek={entries.length > 60} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClinicianCriteriaPage;
