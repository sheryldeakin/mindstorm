import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import RiskBadge from "../components/clinician/RiskBadge";
import { apiFetch } from "../lib/apiClient";
import type { ClinicianCase } from "../types/clinician";
import { Line, LineChart } from "recharts";

const ClinicianDashboardPage = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<ClinicianCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<{ cases: ClinicianCase[] }>("/clinician/cases")
      .then((response) => {
        if (!active) return;
        setCases(response.cases || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load cases.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const getConfidence = (count: number) => {
    if (count >= 14) return "High";
    if (count >= 7) return "Moderate";
    return "Low";
  };

  const filteredCases = useMemo(() => {
    if (riskFilter === "high") {
      return cases.filter((item) => item.lastRiskSignal?.level === "high");
    }
    if (riskFilter === "moderate") {
      return cases.filter((item) => item.lastRiskSignal?.level === "moderate");
    }
    if (riskFilter === "none") {
      return cases.filter((item) => !item.lastRiskSignal?.detected);
    }
    return cases;
  }, [cases, riskFilter]);

  const handleCaseNavigate = (value: string) => {
    setSelectedCase(value);
    if (value) {
      navigate(`/clinician/cases/${value}`);
    }
  };

  const buildSparklineData = (series?: number[]) => {
    if (!series?.length) {
      return Array.from({ length: 30 }, (_, index) => ({ index, value: 0 }));
    }
    return series.map((value, index) => ({ index, value }));
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        eyebrow="Clinician"
        title="Active cases"
        description="Review live patient signals and decide where to focus next."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
            >
              <option value="all">All risk levels</option>
              <option value="high">High risk</option>
              <option value="moderate">Moderate risk</option>
              <option value="none">No risk</option>
            </select>
            <select
              className="h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600"
              value={selectedCase}
              onChange={(event) => handleCaseNavigate(event.target.value)}
            >
              <option value="">Jump to case</option>
              {cases.map((item) => (
                <option key={item.userId} value={item.userId}>
                  {item.name || item.email || item.userId}
                </option>
              ))}
            </select>
          </div>
        )}
      />
      <Card className="p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading cases…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : filteredCases.length === 0 ? (
          <p className="text-sm text-slate-500">No cases available yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.3em] text-slate-400">
                <tr>
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Last entry</th>
                  <th className="pb-3">Data density</th>
                  <th className="pb-3">Confidence</th>
                  <th className="pb-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCases.map((item) => (
                  <tr
                    key={item.userId}
                    className="cursor-pointer text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate(`/clinician/cases/${item.userId}`)}
                  >
                    <td className="py-3">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.email}</div>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{item.lastEntryDate || "—"}</td>
                    <td className="py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-slate-50 p-1">
                          <LineChart width={120} height={32} data={buildSparklineData(item.entriesLast30DaysSeries)}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#5B7BFF"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </div>
                        <span>{item.entriesLast30Days}/30</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {getConfidence(item.entriesLast30Days)}
                    </td>
                    <td className="py-3">
                      <RiskBadge risk={item.lastRiskSignal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ClinicianDashboardPage;
