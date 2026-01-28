import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import DiagnosticLogicGraph from "../components/clinician/DiagnosticLogicGraph";
import EvidenceDrawer from "../components/clinician/EvidenceDrawer";
import { resolveImpactWorkLabelFromUnits } from "../lib/impactLabels";
import { Card } from "../components/ui/Card";
import { apiFetch } from "../lib/apiClient";
import type { CaseEntry, ClinicianCase, ClinicianOverrideRecord, EvidenceUnit } from "../types/clinician";
import useDiagnosticLogic, { type DiagnosticStatus } from "../hooks/useDiagnosticLogic";
import { appendComputedEvidenceToEntries } from "@mindstorm/criteria-graph";
import { DIAGNOSTIC_GRAPH_NODES } from "../lib/diagnosticGraphConfig";
import { buildClarificationPrompts } from "../lib/clinicianPrompts";
import FunctionalImpactCard from "../components/clinician/FunctionalImpactCard";
import useSessionDelta from "../hooks/useSessionDelta";

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
  const sessionDelta = useSessionDelta(selectedCase);

  const buildOverrideMap = (records: ClinicianOverrideRecord[]) =>
    records.reduce<Record<string, DiagnosticStatus>>((acc, item) => {
      acc[item.nodeId] = item.status;
      return acc;
    }, {});

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

  useEffect(() => {
    if (!selectedCase) return;
    let active = true;
    apiFetch<{ overrides: ClinicianOverrideRecord[] }>(`/clinician/cases/${selectedCase}/overrides`)
      .then((response) => {
        if (!active) return;
        setNodeOverrides(buildOverrideMap(response.overrides || []));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load overrides.");
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
          entryId: entry.id,
        })),
      ),
    [entries],
  );

  const entryLookup = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
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
    patientId: selectedCase,
  });

  const clarificationPrompts = useMemo(
    () => buildClarificationPrompts(entries, getStatusForLabels),
    [entries, getStatusForLabels],
  );

  const drawerEvidence = useMemo(() => {
    if (!selectedNode?.labels?.length) return [];
    return evidenceUnits.filter((unit) => selectedNode.labels?.includes(unit.label));
  }, [evidenceUnits, selectedNode]);

  const drawerTitle = useMemo(() => {
    if (!selectedNode) return "Evidence";
    const isImpactWork =
      selectedNode.id === "IMPACT_WORK" ||
      selectedNode.label === "IMPACT_WORK" ||
      selectedNode.labels?.includes("IMPACT_WORK");
    if (isImpactWork) {
      return resolveImpactWorkLabelFromUnits(drawerEvidence, {
        work: "Work",
        school: "School",
        fallback: "Work/School",
      });
    }
    return selectedNode.label || "Evidence";
  }, [drawerEvidence, selectedNode]);

  const saveOverride = async (
    nodeId: string,
    status: DiagnosticStatus | null,
    meta?: { originalStatus?: DiagnosticStatus; originalEvidence?: string; note?: string },
  ) => {
    if (!selectedCase) return;
    if (!status) {
      setNodeOverrides((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
      await apiFetch(`/clinician/cases/${selectedCase}/overrides/${nodeId}`, { method: "DELETE" });
      return;
    }
    const originalStatus = meta?.originalStatus || "UNKNOWN";
    await apiFetch(`/clinician/cases/${selectedCase}/overrides`, {
      method: "POST",
      body: JSON.stringify({
        nodeId,
        status,
        originalStatus,
        originalEvidence: meta?.originalEvidence || "",
        note: meta?.note || "",
      }),
    });
    setNodeOverrides((prev) => ({ ...prev, [nodeId]: status }));
  };

  const handleOverrideChange = (status: DiagnosticStatus | null, note?: string) => {
    if (!selectedNode) return;
    const graphNode = DIAGNOSTIC_GRAPH_NODES.find((node) => node.id === selectedNode.id);
    const originalStatus = graphNode?.evidenceLabels?.length
      ? getStatusForLabels(graphNode.evidenceLabels)
      : "UNKNOWN";
    saveOverride(selectedNode.id, status, {
      originalStatus,
      originalEvidence: selectedNode.label,
      note,
    });
  };

  const handleNodeOverride = (nodeId: string, status: DiagnosticStatus | null, note?: string) => {
    const graphNode = DIAGNOSTIC_GRAPH_NODES.find((node) => node.id === nodeId);
    const originalStatus = graphNode?.evidenceLabels?.length
      ? getStatusForLabels(graphNode.evidenceLabels)
      : "UNKNOWN";
    saveOverride(nodeId, status, {
      originalStatus,
      originalEvidence: graphNode?.label || "",
      note,
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

  const handleEvidenceFeedback = async (
    item: EvidenceUnit & { dateISO: string },
    feedbackType: "correct" | "wrong_label" | "wrong_polarity",
  ) => {
    if (!selectedCase) return;
    await apiFetch(`/clinician/cases/${selectedCase}/feedback`, {
      method: "POST",
      body: JSON.stringify({
        entryDateISO: item.dateISO,
        span: item.span,
        label: item.label,
        feedbackType,
      }),
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
              lastAccessISO={sessionDelta.lastAccessISO}
              patientId={selectedCase}
              onNodeSelect={(node) =>
                setSelectedNode({ id: node.id, label: node.label, labels: node.evidenceLabels })
              }
              onOverrideChange={handleNodeOverride}
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
        title={drawerTitle}
        evidence={drawerEvidence as Array<EvidenceUnit & { dateISO: string; entryId: string }>}
        entryLookup={entryLookup}
        overrideStatus={selectedNode ? nodeOverrides[selectedNode.id] : undefined}
        onOverrideChange={handleOverrideChange}
        rejectedKeys={rejectedEvidenceKeys}
        onToggleReject={handleToggleReject}
        onFeedback={handleEvidenceFeedback}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};

export default ClinicianLogicGraphPage;
