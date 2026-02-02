import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowRightLeft, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/layout/PageHeader";
import ConnectionsGraph from "../components/features/ConnectionsGraph";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import type { ConnectionEdge, ConnectionNode } from "../types/connections";
import { getPatientLabel } from "../lib/patientSignals";

const NORMALIZE_MAP: Record<string, string> = {
  job: "work",
  school: "work",
  career: "work",
  impact_work: "work",
  "work/school": "work",
  symptom_mood: "low mood",
  mood: "low mood",
  tension: "anxiety",
  symptom_anxiety: "anxiety",
};

const isCodeLabel = (label: string) => /^(SYMPTOM|IMPACT|CONTEXT|IMPAIRMENT)_/i.test(label);

const normalizeLabel = (label: string) => {
  const baseLabel = isCodeLabel(label) ? getPatientLabel(label.toUpperCase()) : label;
  const clean = baseLabel.toLowerCase().replace(/_/g, " ").trim();
  if (NORMALIZE_MAP[clean]) return NORMALIZE_MAP[clean];
  if (clean.includes("sleep")) return "sleep";
  return clean;
};

const ConnectionsPage = () => {
  const { status } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rawNodes, setRawNodes] = useState<ConnectionNode[]>([]);
  const [rawEdges, setRawEdges] = useState<ConnectionEdge[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [minStrength, setMinStrength] = useState(0);

  useEffect(() => {
    if (status !== "authed") return;
    setLoading(true);

    apiFetch<{ graph: { nodes: ConnectionNode[]; edges: ConnectionEdge[] } }>(
      "/derived/connections?rangeKey=all_time"
    )
      .then(({ graph }) => {
        setRawNodes(graph.nodes || []);
        setRawEdges(graph.edges || []);
      })
      .finally(() => setLoading(false));
  }, [status]);

  const { cleanNodes, cleanEdges, categorizedEdges } = useMemo(() => {
    const nodeMap = new Map<string, ConnectionNode>();
    const edgeMap = new Map<string, ConnectionEdge>();

    rawNodes.forEach((node) => {
      const normalizedLabel = normalizeLabel(node.label);
      if (!nodeMap.has(normalizedLabel)) {
        nodeMap.set(normalizedLabel, {
          ...node,
          label: normalizedLabel,
          id: normalizedLabel,
        });
      }
    });

    rawEdges.forEach((edge) => {
      const fromLabel = normalizeLabel(edge.from);
      const toLabel = normalizeLabel(edge.to);

      if (fromLabel === toLabel) return;

      const key = [fromLabel, toLabel].sort().join("::");
      const existing = edgeMap.get(key);
      const weight = existing
        ? Math.max(existing.strength, edge.strength)
        : edge.strength;

      if (weight >= minStrength) {
        edgeMap.set(key, {
          ...edge,
          id: key,
          from: fromLabel,
          to: toLabel,
          label: `${fromLabel} ↔ ${toLabel}`,
          strength: weight,
        });
      }
    });

    const finalEdges = Array.from(edgeMap.values());

    const influences = finalEdges.filter(
      (edge) =>
        ["work", "family", "stress", "alcohol"].includes(edge.from) ||
        ["work", "family", "stress", "alcohol"].includes(edge.to)
    );

    const symptoms = finalEdges.filter((edge) => !influences.includes(edge));

    return {
      cleanNodes: Array.from(nodeMap.values()),
      cleanEdges: finalEdges,
      categorizedEdges: { influences, symptoms },
    };
  }, [rawNodes, rawEdges, minStrength]);

  const selectedEdge = cleanEdges.find((edge) => edge.id === selectedEdgeId);

  return (
    <div className="page-container p-6 space-y-8 pb-24">
      <PageHeader
        pageId="connections"
        title="Connections"
        description="Explore how different parts of your experience link together."
      />

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-2 bg-slate-100 rounded-full text-slate-500">
          <SlidersHorizontal size={18} />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Signal Strength Filter: {minStrength}%
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={minStrength}
            onChange={(event) => setMinStrength(Number(event.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand"
          />
        </div>
        <div className="text-xs text-slate-400 w-32 text-right">
          {cleanEdges.length} connections visible
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 relative">
          <Card className="min-h-[500px] flex items-center justify-center bg-slate-50/50 overflow-hidden">
            {loading ? (
              <div className="text-slate-400 animate-pulse">
                Mapping connections...
              </div>
            ) : cleanEdges.length > 0 ? (
              <ConnectionsGraph
                nodes={cleanNodes}
                edges={cleanEdges}
                selectedEdgeId={selectedEdgeId}
                onEdgeSelect={(edge) =>
                  setSelectedEdgeId(
                    edge.id === selectedEdgeId ? undefined : edge.id
                  )
                }
              />
            ) : (
              <div className="text-center p-8">
                <p className="text-slate-500">
                  No strong connections found at this filter level.
                </p>
                <button
                  onClick={() => setMinStrength(5)}
                  className="mt-4 text-brand text-sm font-semibold hover:underline"
                >
                  Show weaker signals
                </button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedEdge ? (
              <motion.div
                key={selectedEdge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-brand/30 bg-brand/5">
                  <div className="p-4">
                    <div className="text-xs font-bold text-brand uppercase tracking-wider mb-2">
                      Selected Link
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 capitalize">
                      {selectedEdge.from}{" "}
                      <ArrowRightLeft size={16} className="text-slate-400" />{" "}
                      {selectedEdge.to}
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      These appear together in{" "}
                      <strong>{selectedEdge.strength}%</strong> of your entries.
                    </div>
                    {selectedEdge.evidence && selectedEdge.evidence.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-brand/10 space-y-2">
                        {selectedEdge.evidence.slice(0, 2).map((ev, index) => (
                          <div
                            key={index}
                            className="text-xs italic text-slate-500 bg-white/60 p-2 rounded-lg border border-brand/5"
                          >
                            "{ev.quote}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 text-sm">
                Tap a line on the graph to see details.
              </div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-2">
              Top Influences
            </h3>
            {categorizedEdges.influences.slice(0, 3).map((edge) => (
              <button
                key={edge.id}
                onClick={() => setSelectedEdgeId(edge.id)}
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-indigo-200 transition-colors group"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 capitalize">
                  {edge.from}{" "}
                  <ArrowRight
                    size={14}
                    className="text-slate-300 group-hover:text-indigo-400"
                  />{" "}
                  {edge.to}
                </div>
                <Badge variant="neutral">{edge.strength}%</Badge>
              </button>
            ))}
            {categorizedEdges.influences.length === 0 && (
              <p className="text-xs text-slate-400 px-2">
                No influences detected yet.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-2 pt-4">
              Symptom Patterns
            </h3>
            {categorizedEdges.symptoms.slice(0, 3).map((edge) => (
              <button
                key={edge.id}
                onClick={() => setSelectedEdgeId(edge.id)}
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-rose-200 transition-colors group"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 capitalize">
                  {edge.from}{" "}
                  <ArrowRightLeft
                    size={14}
                    className="text-slate-300 group-hover:text-rose-400"
                  />{" "}
                  {edge.to}
                </div>
                <Badge variant="neutral">{edge.strength}%</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionsPage;
