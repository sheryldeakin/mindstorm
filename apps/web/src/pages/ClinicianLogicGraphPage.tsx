import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import DiagnosticLogicGraph from "../components/clinician/DiagnosticLogicGraph";
import EvidenceDrawer from "../components/clinician/EvidenceDrawer";
import { Card } from "../components/ui/Card";
import { apiFetch } from "../lib/apiClient";
import type { CaseEntry, ClinicianCase, EvidenceUnit } from "../types/clinician";
import useDiagnosticLogic, { type DiagnosticStatus } from "../hooks/useDiagnosticLogic";
import { DIAGNOSTIC_GRAPH_NODES } from "../lib/diagnosticGraphConfig";
import { buildClarificationPrompts } from "../lib/clinicianPrompts";
import FunctionalImpactCard from "../components/clinician/FunctionalImpactCard";

const ClinicianLogicGraphPage = () => {
  const [cases, setCases] = useState<ClinicianCase[]>([]);
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCase = searchParams.get("caseId") || "";
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; labels?: string[] } | null>(null);
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, DiagnosticStatus>>({});
  const [rejectedEvidenceKeys, setRejectedEvidenceKeys] = useState<Set<string>>(new Set());

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
    setNodeOverrides({});
    setRejectedEvidenceKeys(new Set());
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

  const evidenceUnits = useMemo(
    () =>
      entries.flatMap((entry) =>
        entry.evidenceUnits.map((unit) => ({
          ...unit,
          dateISO: entry.dateISO,
          confidence: entry.risk_signal?.confidence ?? null,
        })),
      ),
    [entries],
  );

  const labelOverrides = useMemo(() => {
    const map: Record<string, DiagnosticStatus> = {};
    Object.entries(nodeOverrides).forEach(([nodeId, status]) => {
      const node = DIAGNOSTIC_GRAPH_NODES.find((item) => item.id === nodeId);
      node?.evidenceLabels?.forEach((label) => {
        map[label] = status;
      });
    });
    return map;
  }, [nodeOverrides]);

  const { getStatusForLabels } = useDiagnosticLogic(entries, {
    overrides: labelOverrides,
    rejectedEvidenceKeys,
  });

  const clarificationPrompts = useMemo(
    () => buildClarificationPrompts(entries, getStatusForLabels),
    [entries, getStatusForLabels],
  );

  const drawerEvidence = useMemo(() => {
    if (!selectedNode?.labels?.length) return [];
    return evidenceUnits.filter((unit) => selectedNode.labels?.includes(unit.label));
  }, [evidenceUnits, selectedNode]);

  const handleOverrideChange = (status: DiagnosticStatus | null) => {
    if (!selectedNode) return;
    setNodeOverrides((prev) => {
      const next = { ...prev };
      if (!status) {
        delete next[selectedNode.id];
        return next;
      }
      next[selectedNode.id] = status;
      return next;
    });
  };

  const handleToggleReject = (item: EvidenceUnit & { dateISO: string }) => {
    const key = `${item.dateISO}::${item.span}`;
    setRejectedEvidenceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        eyebrow="Clinician"
        title="Criteria set logic graph"
        description="Evidence-weighted criteria nodes with three-valued logic."
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
        <Card className="p-6 text-sm text-slate-500">Loading graph…</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-rose-600">{error}</Card>
      ) : (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">DSM criteria logic map</h3>
          <p className="mt-1 text-sm text-slate-500">
            Nodes update based on present, denied, or missing evidence in the last 14 days.
          </p>
          <div className="mt-4">
            <DiagnosticLogicGraph
              entries={entries}
              overrides={labelOverrides}
              nodeOverrides={nodeOverrides}
              rejectedEvidenceKeys={rejectedEvidenceKeys}
              onNodeSelect={(node) =>
                setSelectedNode({ id: node.id, label: node.label, labels: node.evidenceLabels })
              }
            />
          </div>
        </Card>
      )}

      <FunctionalImpactCard entries={entries} />

      {clarificationPrompts.length ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">Needs clarification</h3>
          <p className="mt-1 text-sm text-slate-500">
            Prompts generated for missing or ambiguous signals.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {clarificationPrompts.map((prompt, index) => (
              <li key={`${prompt}-${index}`}>• {prompt}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <EvidenceDrawer
        open={Boolean(selectedNode)}
        title={selectedNode?.label || "Evidence"}
        evidence={drawerEvidence as Array<EvidenceUnit & { dateISO: string }>}
        overrideStatus={selectedNode ? nodeOverrides[selectedNode.id] : undefined}
        onOverrideChange={handleOverrideChange}
        rejectedKeys={rejectedEvidenceKeys}
        onToggleReject={handleToggleReject}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};

export default ClinicianLogicGraphPage;
