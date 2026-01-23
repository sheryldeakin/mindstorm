import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../components/layout/PageHeader";
import { Card } from "../components/ui/Card";
import SymptomHeatmap from "../components/clinician/SymptomHeatmap";
import CriteriaCoverageBar from "../components/clinician/CriteriaCoverageBar";
import DiagnosticLogicGraph from "../components/clinician/DiagnosticLogicGraph";
import EvidenceDrawer from "../components/clinician/EvidenceDrawer";
import { apiFetch } from "../lib/apiClient";
import { buildCoverageMetrics } from "../lib/clinicianMetrics";
import type { CaseEntry, EvidenceUnit } from "../types/clinician";
import { type DiagnosticStatus } from "../hooks/useDiagnosticLogic";
import { DIAGNOSTIC_GRAPH_NODES } from "../lib/diagnosticGraphConfig";
import { buildClarificationPrompts, buildInquiryItems } from "../lib/clinicianPrompts";
import FunctionalImpactCard from "../components/clinician/FunctionalImpactCard";
import SpecifierChips from "../components/clinician/SpecifierChips";
import InquiryAssistant from "../components/clinician/InquiryAssistant";
import ClinicalNoteGenerator from "../components/clinician/ClinicalNoteGenerator";
import ClinicianNotesPanel from "../components/clinician/ClinicianNotesPanel";
import TimeWindowFilter from "../components/clinician/TimeWindowFilter";
import CaseStatusHeader from "../components/clinician/CaseStatusHeader";
import ClinicianWorkspace from "../components/clinician/ClinicianWorkspace";
import { ClinicalCaseProvider, useClinicalCase } from "../contexts/ClinicalCaseContext";

const buildDensitySeries = (entries: CaseEntry[]) => {
  if (!entries.length) return Array.from({ length: 30 }, () => 0);
  const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const latest = sorted[sorted.length - 1];
  if (!latest) return Array.from({ length: 30 }, () => 0);
  const latestDate = new Date(`${latest.dateISO}T00:00:00Z`);
  const series = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(latestDate);
    date.setDate(latestDate.getDate() - (29 - index));
    return date.toISOString().slice(0, 10);
  });
  return series.map((dateISO) =>
    entries.filter((entry) => entry.dateISO === dateISO).length,
  );
};

const countNewCritical = (entries: CaseEntry[], lastAccessISO: string | null) => {
  if (!lastAccessISO) return 0;
  const lastAccessDate = new Date(lastAccessISO);
  return entries.filter((entry) => {
    const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
    return entryDate > lastAccessDate && entry.risk_signal?.level === "high";
  }).length;
};

const buildContextEvents = (entries: CaseEntry[]) => {
  const events: Array<{ dateISO: string; label: string; type: "medical" | "substance" }> = [];
  entries.forEach((entry) => {
    const units = entry.evidenceUnits ?? [];
    units.forEach((unit) => {
      if (unit.attributes?.polarity !== "PRESENT") return;
      if (unit.label === "CONTEXT_MEDICAL") {
        events.push({ dateISO: entry.dateISO, label: unit.span, type: "medical" });
      }
      if (unit.label === "CONTEXT_SUBSTANCE") {
        events.push({ dateISO: entry.dateISO, label: unit.span, type: "substance" });
      }
    });
  });
  return events;
};

const ClinicianCasePageContent = () => {
  const {
    caseId,
    userName,
    entries,
    loading,
    error,
    nodeOverrides,
    overrideRecords,
    notes,
    graphLogic,
    sessionDelta,
    saveOverride,
    saveNote,
    updateNote,
    deleteNote,
  } = useClinicalCase();
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; labels?: string[] } | null>(null);
  const [rejectedEvidenceKeys, setRejectedEvidenceKeys] = useState<Set<string>>(new Set());
  const [highlightLabels, setHighlightLabels] = useState<string[] | null>(null);
  const [windowDays, setWindowDays] = useState<number>(90);

  const evidenceUnits = useMemo(
    () =>
      entries.flatMap((entry) =>
        (entry.evidenceUnits ?? []).map((unit) => ({
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

  const clarificationPrompts = useMemo(
    () => buildClarificationPrompts(entries, graphLogic.getStatusForLabels),
    [entries, graphLogic],
  );
  const inquiryItems = useMemo(
    () => buildInquiryItems(entries, graphLogic.getStatusForLabels),
    [entries, graphLogic],
  );

  const useWeeklyHeatmap = entries.length > 60;
  const heatmapEntries = useMemo(() => {
    if (windowDays <= 0) return entries;
    if (!entries.length) return [];
    const sorted = [...entries].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const latest = sorted[sorted.length - 1];
    if (!latest) return [];
    const latestDate = new Date(`${latest.dateISO}T00:00:00Z`);
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - windowDays + 1);
    return sorted.filter((entry) => {
      const entryDate = new Date(`${entry.dateISO}T00:00:00Z`);
      return entryDate >= cutoff && entryDate <= latestDate;
    });
  }, [entries, windowDays]);

  const coverage = useMemo(
    () => buildCoverageMetrics(entries, undefined, rejectedEvidenceKeys, { nodeOverrides }),
    [entries, rejectedEvidenceKeys, nodeOverrides],
  );

  const drawerEvidence = useMemo(() => {
    if (!selectedNode?.labels?.length) return [];
    const filtered = evidenceUnits.filter((unit) => selectedNode.labels?.includes(unit.label));
    const seenSpans = new Set<string>();
    return filtered.filter((unit) => {
      const span = unit.span || "";
      if (!span) return true;
      const normalized = span.trim();
      if (seenSpans.has(normalized)) return false;
      seenSpans.add(normalized);
      return true;
    });
  }, [evidenceUnits, selectedNode]);

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

  const handleOverrideChange = (status: DiagnosticStatus | null, note?: string) => {
    if (!selectedNode) return;
    const graphNode = DIAGNOSTIC_GRAPH_NODES.find((node) => node.id === selectedNode.id);
    const originalStatus = graphNode?.evidenceLabels?.length
      ? graphLogic.getStatusForLabels(graphNode.evidenceLabels)
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
      ? graphLogic.getStatusForLabels(graphNode.evidenceLabels)
      : "UNKNOWN";
    saveOverride(nodeId, status, {
      originalStatus,
      originalEvidence: graphNode?.label || "",
      note,
    });
  };

  const handleEvidenceFeedback = async (
    item: EvidenceUnit & { dateISO: string },
    feedbackType: "correct" | "wrong_label" | "wrong_polarity",
  ) => {
    await apiFetch(`/clinician/cases/${caseId}/feedback`, {
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
          <CaseStatusHeader
            name={userName}
            lastEntryDate={entries[entries.length - 1]?.dateISO || ""}
            riskSignal={entries[entries.length - 1]?.risk_signal || null}
            densitySeries={buildDensitySeries(entries)}
            newCriticalCount={countNewCritical(entries, sessionDelta.lastAccessISO)}
            unknownGateCount={inquiryItems.length}
          />

          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Clinical course heatmap</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {useWeeklyHeatmap ? "Weekly rollup view." : "Daily view."} New activity is highlighted since your last review.
                </p>
              </div>
              <TimeWindowFilter
                value={windowDays}
                onChange={setWindowDays}
                onReset={sessionDelta.markReviewed}
              />
            </div>
            <div className="mt-4">
              <SymptomHeatmap
                entries={heatmapEntries}
                groupByWeek={useWeeklyHeatmap}
                highlightLabels={highlightLabels ?? []}
                lastAccessISO={sessionDelta.lastAccessISO}
                contextEvents={buildContextEvents(entries)}
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
                patientId={caseId}
                nodeOverrides={nodeOverrides}
                rejectedEvidenceKeys={rejectedEvidenceKeys}
                lastAccessISO={sessionDelta.lastAccessISO}
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

          <ClinicianWorkspace
            triage={(
              <InquiryAssistant items={inquiryItems} onOverride={handleNodeOverride} />
            )}
            draft={(
              <ClinicalNoteGenerator
                entries={entries}
                getStatusForLabels={graphLogic.getStatusForLabels}
                nodeOverrides={nodeOverrides}
              />
            )}
            notes={(
              <ClinicianNotesPanel
                notes={notes}
                auditItems={overrideRecords.map((record) => ({
                  label: `${record.nodeId} → ${record.status} (Auto: ${record.originalStatus})`,
                  detail: record.note || record.originalEvidence || "",
                  dateISO: record.updatedAt ? record.updatedAt.slice(0, 10) : "",
                }))}
                onCreate={saveNote}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            )}
          />
        </>
      )}

      <EvidenceDrawer
        open={Boolean(selectedNode)}
        title={selectedNode?.label || "Evidence"}
        evidence={drawerEvidence}
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

const ClinicianCasePage = () => {
  const { userId } = useParams();
  if (!userId) {
    return <Card className="p-6 text-sm text-slate-500">Select a case to begin.</Card>;
  }
  return (
    <ClinicalCaseProvider caseId={userId}>
      <ClinicianCasePageContent />
    </ClinicalCaseProvider>
  );
};

export default ClinicianCasePage;
