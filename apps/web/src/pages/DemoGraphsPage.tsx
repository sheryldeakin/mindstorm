import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import ImpactFlow from "../components/features/ImpactFlow";
import PatternStream from "../components/features/PatternStream";
import LifeBalanceCompass from "../components/features/LifeBalanceCompass";
import IntroSequence from "../components/features/IntroSequence";
import MindstormScene from "../components/avatar/MindstormScene";
import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { ConnectionEdge, ConnectionNode } from "../lib/vizUtils";
import { buildImpactFlowFromEntries } from "../lib/vizUtils";
import useEntries from "../hooks/useEntries";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import type { ConnectionEdge as RawConnectionEdge, ConnectionNode as RawConnectionNode } from "../types/connections";
import { usePatientTranslation } from "../hooks/usePatientTranslation";

const RANGE_KEY = "last_30_days";

const normalizeCode = (value: string) => {
  if (!value) return "";
  const base = value.includes(":") ? value.split(":")[0] : value;
  return base.trim().toUpperCase();
};

const resolveNodeType = (value: string): ConnectionNode["type"] => {
  const code = normalizeCode(value);
  if (code.startsWith("CONTEXT_")) return "context";
  if (code.startsWith("IMPACT_")) return "impact";
  return "symptom";
};

const DemoGraphsPage = () => {
  const { status } = useAuth();
  const { getPatientLabel } = usePatientTranslation();
  const [graphNodes, setGraphNodes] = useState<ConnectionNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<ConnectionEdge[]>([]);
  const [series, setSeries] = useState<ThemeSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ domain: "context" | "symptom" | "impact"; id: string; label: string } | null>(null);
  const { data: entries } = useEntries({ limit: 50 });

  useEffect(() => {
    if (status !== "authed") {
      setGraphNodes([]);
      setGraphEdges([]);
      setSeries([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<{ graph: { nodes: RawConnectionNode[]; edges: RawConnectionEdge[] } }>(
        `/derived/connections?rangeKey=${RANGE_KEY}`,
      ),
      apiFetch<{ series: ThemeSeries[] }>(`/derived/theme-series?rangeKey=${RANGE_KEY}`),
    ])
      .then(([graphResponse, seriesResponse]) => {
        const nextNodes: ConnectionNode[] = (graphResponse.graph.nodes || []).map((node) => ({
          id: node.id,
          label: node.label || node.id,
          type: resolveNodeType(node.id || node.label),
        }));
        const nextEdges: ConnectionEdge[] = (graphResponse.graph.edges || []).map((edge) => ({
          from: edge.from,
          to: edge.to,
          weight: edge.strength ?? 0,
        }));
        setGraphNodes(nextNodes);
        setGraphEdges(nextEdges);
        setSeries(seriesResponse.series || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load demo graphs.");
        setGraphNodes([]);
        setGraphEdges([]);
        setSeries([]);
      })
      .finally(() => setLoading(false));
  }, [status]);

  const fallbackFlow = useMemo(
    () => buildImpactFlowFromEntries(entries),
    [entries],
  );

  const impactFlowNodes = graphNodes.length ? graphNodes : fallbackFlow.nodes;
  const impactFlowEdges = graphEdges.length ? graphEdges : fallbackFlow.edges;

  const contextItems = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      (entry.triggers || []).forEach((trigger) => {
        const label = String(trigger || "").trim();
        if (!label) return;
        counts.set(label, (counts.get(label) || 0) + 1);
      });
      (entry.evidenceUnits || []).forEach((unit) => {
        const code = normalizeCode(unit.label);
        if (!code.startsWith("CONTEXT_")) return;
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({
        id,
        label: getPatientLabel(id),
        subtext: `${count} mentions`,
      }));
  }, [entries, getPatientLabel]);

  const symptomItems = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      (entry.emotions || []).forEach((emotion) => {
        const label = String(emotion.label || "").trim();
        if (!label) return;
        counts.set(label, (counts.get(label) || 0) + 1);
      });
      (entry.evidenceUnits || []).forEach((unit) => {
        const code = normalizeCode(unit.label);
        if (!code.startsWith("SYMPTOM_")) return;
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({
        id,
        label: getPatientLabel(id),
        subtext: `${count} signals`,
      }));
  }, [entries, getPatientLabel]);

  const impactItems = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      (entry.evidenceUnits || []).forEach((unit) => {
        const code = normalizeCode(unit.label);
        if (!code.startsWith("IMPACT_")) return;
        counts.set(code, (counts.get(code) || 0) + 1);
      });
      [...(entry.tags || []), ...(entry.themes || [])].forEach((tag) => {
        const label = String(tag || "").trim();
        if (!label) return;
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, count]) => ({
        id,
        label: getPatientLabel(id),
        subtext: `${count} reflections`,
      }));
  }, [entries, getPatientLabel]);

  const filteredImpactFlow = useMemo(() => {
    if (!selection || selection.domain === "impact") return { nodes: impactFlowNodes, edges: impactFlowEdges };
    const id = selection.id;
    if (selection.domain === "context") {
      const edges = impactFlowEdges.filter((edge) => edge.from === id);
      const nodeIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
      return { nodes: impactFlowNodes.filter((node) => nodeIds.has(node.id)), edges };
    }
    if (selection.domain === "symptom") {
      const edges = impactFlowEdges.filter((edge) => edge.from === id || edge.to === id);
      const nodeIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
      return { nodes: impactFlowNodes.filter((node) => nodeIds.has(node.id)), edges };
    }
    return { nodes: impactFlowNodes, edges: impactFlowEdges };
  }, [impactFlowEdges, impactFlowNodes, selection]);

  const filteredEntries = useMemo(() => {
    if (!selection) return entries;
    const needle = selection.id.toLowerCase();
    return entries.filter((entry) => {
      const hasTrigger = (entry.triggers || []).some((trigger) => String(trigger).toLowerCase().includes(needle));
      const hasEmotion = (entry.emotions || []).some((emotion) =>
        String(emotion.label).toLowerCase().includes(needle),
      );
      const hasTag = (entry.tags || []).some((tag) => String(tag).toLowerCase().includes(needle));
      const hasTheme = (entry.themes || []).some((theme) => String(theme).toLowerCase().includes(needle));
      const hasEvidence = (entry.evidenceUnits || []).some((unit) =>
        String(unit.label).toLowerCase().includes(needle),
      );
      return hasTrigger || hasEmotion || hasTag || hasTheme || hasEvidence;
    });
  }, [entries, selection]);

  const filteredSeries = useMemo(() => {
    if (!selection || selection.domain !== "symptom") return series;
    const needle = selection.label.toLowerCase();
    return series.filter((item) => item.theme.toLowerCase().includes(needle));
  }, [selection, series]);

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="demo-graphs" />
      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <MindstormScene />

      <IntroSequence
        contextItems={contextItems}
        symptomItems={symptomItems}
        impactItems={impactItems}
        onSelectMetric={(domain, item) => {
          if (domain === "root") return;
          setSelection({ domain, id: item.id, label: item.label });
        }}
      />

      {selection && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Focused view</p>
            <h3 className="text-lg font-semibold text-slate-700">{selection.label}</h3>
          </div>
          {selection.domain === "context" && (
            <ImpactFlow nodes={filteredImpactFlow.nodes} edges={filteredImpactFlow.edges} />
          )}
          {selection.domain === "symptom" && (
            <PatternStream series={filteredSeries} />
          )}
          {selection.domain === "impact" && (
            <LifeBalanceCompass entries={filteredEntries} />
          )}
        </div>
      )}

      {!selection && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-sm text-slate-500">
          Choose a path above to reveal a focused view.
        </div>
      )}
    </div>
  );
};

export default DemoGraphsPage;
