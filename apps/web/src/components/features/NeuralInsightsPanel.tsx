import { useMemo } from "react";
import { Activity, Clock, Quote, Repeat, Zap, TrendingUp } from "lucide-react";
import type { JournalEntry } from "../../types/journal";
import type { NeuralCircuitNode } from "./NeuralCircuit";

export type NeuralInsightEdge = {
  from: string;
  to: string;
  avgLag?: number;
  frequency?: number;
  confidence?: number;
  evidenceEntryIds?: string[];
};

type EvidenceQuote = {
  source: string;
  target: string;
  quote: string;
  date: string;
};

type NeuralInsightsPanelProps = {
  activePath: string[] | null;
  nodes: NeuralCircuitNode[];
  edges: NeuralInsightEdge[];
  entries: JournalEntry[];
  rankedCycles?: Array<{ cycle: string[]; strength: number }>;
};

const pickEntryText = (entry: JournalEntry) => {
  if (entry.summary) return entry.summary;
  return entry.body || "Entry captured in your journal.";
};

const formatDate = (entry: JournalEntry) => entry.dateISO || entry.date || "Unknown date";

const buildNodeLabelMap = (nodes: NeuralCircuitNode[]) =>
  nodes.reduce<Record<string, string>>((acc, node) => {
    acc[node.id] = node.label;
    return acc;
  }, {});

const NeuralInsightsPanel = ({ activePath, nodes, edges, entries, rankedCycles = [] }: NeuralInsightsPanelProps) => {
  const nodeLabels = useMemo(() => buildNodeLabelMap(nodes), [nodes]);

  const pathMetrics = useMemo(() => {
    if (!activePath || activePath.length < 2) return null;

    let totalLag = 0;
    let minConfidence = 1;
    let totalFrequency = 0;
    const evidenceQuotes: EvidenceQuote[] = [];

    for (let i = 0; i < activePath.length - 1; i += 1) {
      const source = activePath[i];
      const target = activePath[i + 1];
      const edge = edges.find((item) => item.from === source && item.to === target);
      if (!edge) continue;

      totalLag += edge.avgLag ?? 0;
      const confidence = edge.confidence ?? 0;
      minConfidence = Math.min(minConfidence, confidence);
      totalFrequency += edge.frequency ?? 0;

      const evidenceIds = edge.evidenceEntryIds ?? [];
      evidenceIds.slice(0, 2).forEach((entryId) => {
        const entry = entries.find((item) => item.id === entryId);
        if (!entry) return;
        evidenceQuotes.push({
          source: nodeLabels[source] ?? source,
          target: nodeLabels[target] ?? target,
          quote: pickEntryText(entry).slice(0, 120),
          date: formatDate(entry),
        });
      });
    }

    const avgFrequency =
      activePath.length > 1 ? Math.round(totalFrequency / (activePath.length - 1 || 1)) : 0;

    return {
      totalLag: Math.round(totalLag),
      confidence: Math.round(minConfidence * 100),
      frequency: avgFrequency,
      evidenceQuotes,
      startNode: nodeLabels[activePath[0]] ?? activePath[0],
      endNode: nodeLabels[activePath[activePath.length - 1]] ?? activePath[activePath.length - 1],
    };
  }, [activePath, edges, entries, nodeLabels]);

  const globalStats = useMemo(() => {
    if (!edges.length) return null;
    const counts = new Map<string, number>();
    edges.forEach((edge) => {
      counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
      counts.set(edge.to, (counts.get(edge.to) || 0) + 1);
    });

    const [topNodeId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const strongestEdge = [...edges].sort((a, b) => {
      const scoreA = (a.confidence ?? 0) * 100 + (a.frequency ?? 0);
      const scoreB = (b.confidence ?? 0) * 100 + (b.frequency ?? 0);
      return scoreB - scoreA;
    })[0];
    const topCycle = rankedCycles[0];
    const totalLag = edges.reduce((sum, edge) => sum + (edge.avgLag ?? 0), 0);
    const avgLag = edges.length ? Math.round(totalLag / edges.length) : 0;

    return {
      topNodeLabel: topNodeId ? nodeLabels[topNodeId] ?? topNodeId : "—",
      topPathLabel: strongestEdge
        ? `${nodeLabels[strongestEdge.from] ?? strongestEdge.from} → ${nodeLabels[strongestEdge.to] ?? strongestEdge.to}`
        : "—",
      topPathConfidence: strongestEdge ? Math.round((strongestEdge.confidence ?? 0) * 100) : 0,
      topCycleLabel: topCycle
        ? topCycle.cycle.map((id) => nodeLabels[id] ?? id).join(" → ")
        : "—",
      avgLag,
      totalEdges: edges.length,
    };
  }, [edges, nodeLabels, rankedCycles]);

  if (!pathMetrics) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-700">System topology</h3>
          <p className="mt-2 text-xs text-indigo-700/80">
            Overview of how your experiences connect over time.
          </p>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Most common patterns</div>
            <div className="mt-3 space-y-3">
              <div className="border-l-2 border-indigo-100 pl-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <Repeat size={12} className="text-indigo-400" />
                  Recurring cycle
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{globalStats?.topCycleLabel ?? "—"}</div>
              </div>
              <div className="border-l-2 border-emerald-100 pl-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <Zap size={12} className="text-emerald-500" />
                  Strongest link {globalStats?.topPathConfidence ? `(${globalStats.topPathConfidence}%)` : ""}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-800">{globalStats?.topPathLabel ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <TrendingUp size={14} className="text-slate-400" />
              Links found
            </div>
            <div className="mt-2 text-base font-semibold text-slate-800">
              {globalStats?.totalEdges ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock size={14} className="text-slate-400" />
              Avg. reaction
            </div>
            <div className="mt-2 text-base font-semibold text-slate-800">
              {globalStats ? (globalStats.avgLag === 0 ? "Same day" : `~${globalStats.avgLag} days`) : "—"}
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Pattern analysis</h3>
        <p className="mt-3 text-sm text-slate-600">
          When <span className="font-semibold text-indigo-600">{pathMetrics.startNode}</span> appears, it tends to lead
          to <span className="font-semibold text-amber-600">{pathMetrics.endNode}</span>.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {pathMetrics.totalLag === 0 ? "Same day" : `~${pathMetrics.totalLag} days`}
          </span>
          <span className="flex items-center gap-1.5">
            <Repeat size={14} /> Seen {pathMetrics.frequency} times
          </span>
          <span className="flex items-center gap-1.5">
            <Activity size={14} /> {pathMetrics.confidence}% confidence
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Evidence trail</h4>
        <div className="mt-3 space-y-3">
          {pathMetrics.evidenceQuotes.length ? (
            pathMetrics.evidenceQuotes.map((quote, idx) => (
              <div
                key={`${quote.source}-${quote.target}-${idx}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs"
              >
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Quote size={12} />
                  {quote.date} · {quote.source} → {quote.target}
                </div>
                <p className="mt-2 text-slate-700">“{quote.quote}”</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Evidence details are loading or unavailable for this path.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NeuralInsightsPanel;
