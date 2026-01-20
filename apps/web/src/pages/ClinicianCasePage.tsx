import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import SymptomHeatmap from "../components/clinician/SymptomHeatmap";
import CriteriaCoverageBar from "../components/clinician/CriteriaCoverageBar";
import DiagnosticLogicGraph from "../components/clinician/DiagnosticLogicGraph";
import EvidenceDrawer from "../components/clinician/EvidenceDrawer";
import { apiFetch } from "../lib/apiClient";
import { buildCoverageMetrics } from "../lib/clinicianMetrics";
import type { CaseEntry, EvidenceUnit, ClinicianNote, ClinicianOverrideRecord } from "../types/clinician";
import useDiagnosticLogic, { type DiagnosticStatus } from "../hooks/useDiagnosticLogic";
import { DIAGNOSTIC_GRAPH_NODES } from "../lib/diagnosticGraphConfig";
import { buildClarificationPrompts, buildInquiryItems } from "../lib/clinicianPrompts";
import FunctionalImpactCard from "../components/clinician/FunctionalImpactCard";
import SpecifierChips from "../components/clinician/SpecifierChips";
import InquiryAssistant from "../components/clinician/InquiryAssistant";
import ClinicalNoteGenerator from "../components/clinician/ClinicalNoteGenerator";
import ClinicianNotesPanel from "../components/clinician/ClinicianNotesPanel";

const ClinicianCasePage = () => {
  const { userId } = useParams();
  const [entries, setEntries] = useState<CaseEntry[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; labels?: string[] } | null>(null);
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, DiagnosticStatus>>({});
  const [rejectedEvidenceKeys, setRejectedEvidenceKeys] = useState<Set<string>>(new Set());
  const [highlightLabels, setHighlightLabels] = useState<string[] | null>(null);
  const [notes, setNotes] = useState<ClinicianNote[]>([]);
  const [overrideRecords, setOverrideRecords] = useState<ClinicianOverrideRecord[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setNodeOverrides({});
    setRejectedEvidenceKeys(new Set());
    Promise.all([
      apiFetch<{ user: { name: string }; entries: CaseEntry[] }>(`/clinician/cases/${userId}/entries`),
      apiFetch<{ overrides: ClinicianOverrideRecord[] }>(`/clinician/cases/${userId}/overrides`),
      apiFetch<{ notes: ClinicianNote[] }>(`/clinician/cases/${userId}/notes`),
    ])
      .then(([entryResponse, overrideResponse, notesResponse]) => {
        if (!active) return;
        setEntries(entryResponse.entries || []);
        setUserName(entryResponse.user?.name || "Patient");
        setNotes(notesResponse.notes || []);
        setOverrideRecords(overrideResponse.overrides || []);
        const overrideMap = (overrideResponse.overrides || []).reduce<Record<string, DiagnosticStatus>>(
          (acc, item) => {
            acc[item.nodeId] = item.status;
            return acc;
          },
          {},
        );
        setNodeOverrides(overrideMap);
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
  }, [userId]);

  const evidenceUnits = useMemo(
    () =>
      entries.flatMap((entry) =>
        (entry.evidenceUnits ?? []).map((unit) => ({
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

  const baseLogic = useDiagnosticLogic(entries);
  const { getStatusForLabels } = useDiagnosticLogic(entries, {
    overrides: labelOverrides,
    rejectedEvidenceKeys,
  });

  const clarificationPrompts = useMemo(
    () => buildClarificationPrompts(entries, getStatusForLabels),
    [entries, getStatusForLabels],
  );
  const inquiryItems = useMemo(
    () => buildInquiryItems(entries, getStatusForLabels),
    [entries, getStatusForLabels],
  );

  const useWeeklyHeatmap = entries.length > 60;

  const coverage = useMemo(
    () => buildCoverageMetrics(entries, undefined, rejectedEvidenceKeys, { nodeOverrides }),
    [entries, rejectedEvidenceKeys, nodeOverrides],
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

  const handleNodeOverride = async (nodeId: string, status: DiagnosticStatus | null) => {
    const graphNode = DIAGNOSTIC_GRAPH_NODES.find((node) => node.id === nodeId);
    const originalStatus = graphNode?.evidenceLabels?.length
      ? baseLogic.getStatusForLabels(graphNode.evidenceLabels)
      : "UNKNOWN";
    setNodeOverrides((prev) => {
      const next = { ...prev };
      if (!status) {
        delete next[nodeId];
        return next;
      }
      next[nodeId] = status;
      return next;
    });
    if (!userId) return;
    if (!status) {
      await apiFetch(`/clinician/cases/${userId}/overrides/${nodeId}`, { method: "DELETE" });
      setOverrideRecords((prev) => prev.filter((item) => item.nodeId !== nodeId));
      return;
    }
    const response = await apiFetch<{ override: ClinicianOverrideRecord }>(
      `/clinician/cases/${userId}/overrides`,
      {
        method: "POST",
        body: JSON.stringify({
          nodeId,
          status,
          originalStatus,
          originalEvidence: selectedNode?.label || "",
        }),
      },
    );
    if (response.override) {
      setOverrideRecords((prev) => {
        const next = prev.filter((item) => item.nodeId !== response.override.nodeId);
        next.unshift(response.override);
        return next;
      });
    }
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
    <div className="space-y-8 text-slate-900">
      <PageHeader
        eyebrow="Clinician"
        title={`Evaluation: ${userName}`}
        description="Criteria alignment based on observed evidence signals."
      />
      {loading ? (
        <Card className="p-6 text-sm text-slate-500">Loading case data…</Card>
      ) : error ? (
        <Card className="p-6 text-sm text-rose-600">{error}</Card>
      ) : (
        <>
          <Card className="p-6">
            <h3 className="text-lg font-semibold">Clinical course heatmap</h3>
            <p className="mt-1 text-sm text-slate-500">
              {useWeeklyHeatmap ? "Weekly rollup view." : "Daily view."}
            </p>
            <div className="mt-4">
              <SymptomHeatmap
                entries={entries}
                groupByWeek={useWeeklyHeatmap}
                highlightLabels={highlightLabels ?? []}
              />
            </div>
          </Card>

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
            <h3 className="text-lg font-semibold">Diagnostic logic graph</h3>
            <p className="mt-1 text-sm text-slate-500">
              Nodes update based on present, denied, or missing evidence.
            </p>
            <div className="mt-4">
              <DiagnosticLogicGraph
                entries={entries}
                overrides={labelOverrides}
                nodeOverrides={nodeOverrides}
                rejectedEvidenceKeys={rejectedEvidenceKeys}
                onOverrideChange={handleNodeOverride}
                onNodeSelect={(node) =>
                  setSelectedNode({ id: node.id, label: node.label, labels: node.evidenceLabels })
                }
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Specifier trajectory</h3>
            <p className="mt-1 text-sm text-slate-500">
              Active specifiers are bold; historical specifiers show date ranges.
            </p>
            <div className="mt-4">
              <SpecifierChips entries={entries} onHover={setHighlightLabels} />
            </div>
          </Card>

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

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Inquiry assistant</h3>
            <p className="mt-1 text-sm text-slate-500">
              Resolve unknown gates quickly and update the logic graph.
            </p>
            <div className="mt-4">
              <InquiryAssistant items={inquiryItems} onOverride={handleNodeOverride} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Clinical note draft</h3>
            <p className="mt-1 text-sm text-slate-500">
              Generate a structured summary based on current evidence and overrides.
            </p>
            <div className="mt-4">
              <ClinicalNoteGenerator
                entries={entries}
                getStatusForLabels={getStatusForLabels}
                nodeOverrides={nodeOverrides}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold">Clinician notes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Private notes tied to this patient.
            </p>
            <div className="mt-4">
              <ClinicianNotesPanel
                notes={notes}
                auditItems={overrideRecords.map((record) => ({
                  label: `${record.nodeId} → ${record.status} (Auto: ${record.originalStatus})`,
                  detail: record.originalEvidence || "",
                  dateISO: record.updatedAt ? record.updatedAt.slice(0, 10) : "",
                }))}
                onCreate={async (payload) => {
                  if (!userId) return;
                  const response = await apiFetch<{ note: ClinicianNote }>(
                    `/clinician/cases/${userId}/notes`,
                    { method: "POST", body: JSON.stringify(payload) },
                  );
                  if (response.note) {
                    setNotes((prev) => [response.note, ...prev]);
                  }
                }}
                onUpdate={async (noteId, payload) => {
                  if (!userId) return;
                  const response = await apiFetch<{ note: ClinicianNote }>(
                    `/clinician/cases/${userId}/notes/${noteId}`,
                    { method: "PATCH", body: JSON.stringify(payload) },
                  );
                  if (response.note) {
                    setNotes((prev) =>
                      prev.map((note) => (note.id === noteId ? response.note : note)),
                    );
                  }
                }}
                onDelete={async (noteId) => {
                  if (!userId) return;
                  await apiFetch(`/clinician/cases/${userId}/notes/${noteId}`, { method: "DELETE" });
                  setNotes((prev) => prev.filter((note) => note.id !== noteId));
                }}
              />
            </div>
          </Card>
        </>
      )}

      <EvidenceDrawer
        open={Boolean(selectedNode)}
        title={selectedNode?.label || "Evidence"}
        evidence={drawerEvidence}
        overrideStatus={selectedNode ? nodeOverrides[selectedNode.id] : undefined}
        onOverrideChange={handleOverrideChange}
        rejectedKeys={rejectedEvidenceKeys}
        onToggleReject={handleToggleReject}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};

export default ClinicianCasePage;
