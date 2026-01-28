import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import MindstormJourneyLab from "../components/avatar/MindstormJourneyLab";
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

const DemoGraphsLabPage = () => {
  const { status } = useAuth();
  const { getPatientLabel } = usePatientTranslation();
  const [graphNodes, setGraphNodes] = useState<ConnectionNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<ConnectionEdge[]>([]);
  const [series, setSeries] = useState<ThemeSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<"root" | "context" | "symptom" | "impact">("root");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    if (activeDomain === "root") return;
    const timer = window.setTimeout(() => setActiveDomain("root"), 3200);
    return () => window.clearTimeout(timer);
  }, [activeDomain]);

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

  const connectionNodes = useMemo(
    () => impactFlowNodes.map((node) => ({ id: node.id, label: node.label })),
    [impactFlowNodes],
  );
  const connectionEdges = useMemo(
    () =>
      impactFlowEdges.map((edge, index) => ({
        id: `${edge.from}-${edge.to}-${index}`,
        from: edge.from,
        to: edge.to,
        label: `${edge.from} → ${edge.to}`,
        strength: Math.round(edge.weight),
        evidence: [],
      })),
    [impactFlowEdges],
  );

  return (
    <div className="space-y-8 text-slate-900">
      <PageHeader pageId="demo-graphs-lab" />
      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white/90">
        <div className="absolute inset-0">
          <MindstormJourneyLab
            activeDomain={activeDomain}
            onSelectDomain={(domain) => {
              setActiveDomain(domain);
              setSelectedEdgeId(undefined);
            }}
            nodes={connectionNodes}
            edges={connectionEdges}
            selectedEdgeId={selectedEdgeId}
            onEdgeSelect={(edge) => setSelectedEdgeId(edge.id)}
            series={series}
            entries={entries}
          />
        </div>
      </div>
    </div>
  );
};

export default DemoGraphsLabPage;
