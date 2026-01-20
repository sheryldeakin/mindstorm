import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as go from "gojs";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import PageHeader from "../components/layout/PageHeader";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import { usePatientTranslation } from "../hooks/usePatientTranslation";

type NodeData = {
  key: string;
  text: string;
  color: string;
  loc: string;
  kind: "symptom" | "context" | "impact";
};
type LinkData = {
  from: string;
  to: string;
  color: string;
  weight: number;
  lagDaysMin?: number;
  avgLag?: number;
};
type CycleEdge = {
  sourceNode: string;
  targetNode: string;
  frequency: number;
  confidence: number;
  lagDaysMin?: number;
  avgLag?: number;
  evidenceEntryIds: string[];
};

const CARD_COLOR = "#dad9d9";
const TEXT_COLOR = "#122F41";
const BASE_LINE_COLOR = "#d3d3d3";

const toLinkColor = (confidence: number) => {
  if (confidence >= 0.7) return "#0f172a";
  if (confidence >= 0.45) return "#334155";
  if (confidence >= 0.25) return "#64748b";
  return "#cbd5f5";
};

const buildAdjacency = (links: LinkData[]) => {
  const adjacency = new Map<string, string[]>();
  links.forEach((link) => {
    if (!adjacency.has(link.from)) adjacency.set(link.from, []);
    adjacency.get(link.from)!.push(link.to);
  });
  return adjacency;
};

const gatherPaths = (start: string, adjacency: Map<string, string[]>, depth = 6) => {
  const results: string[][] = [];
  const dfs = (current: string, path: string[]) => {
    if (path.length > depth) return;
    const neighbors = adjacency.get(current) ?? [];
    neighbors.forEach((neighbor) => {
      if (path.includes(neighbor)) return;
      const nextPath = [...path, neighbor];
      results.push(nextPath);
      dfs(neighbor, nextPath);
    });
  };
  dfs(start, [start]);
  return results;
};

const CyclesGraphPage = () => {
  const { status } = useAuth();
  const { getPatientLabel } = usePatientTranslation();
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const diagramInstance = useRef<go.Diagram | null>(null);
  const [cycleEdges, setCycleEdges] = useState<CycleEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ primary: string | null; comparison: string | null }>({
    primary: null,
    comparison: null,
  });
  const nodeDataArray = useMemo<NodeData[]>(() => {
    const labels = new Set<string>();
    cycleEdges.forEach((edge) => {
      labels.add(edge.sourceNode);
      labels.add(edge.targetNode);
    });
    return Array.from(labels).map((label, index) => ({
      key: label,
      text: getPatientLabel(label),
      color: CARD_COLOR,
      loc: `${index * 120} 0`,
      kind: label.startsWith("CONTEXT_")
        ? "context"
        : label.startsWith("IMPACT_")
          ? "impact"
          : "symptom",
    }));
  }, [cycleEdges, getPatientLabel]);

  const linkDataArray = useMemo<LinkData[]>(() => {
    return cycleEdges.map((edge) => ({
      from: edge.sourceNode,
      to: edge.targetNode,
      color: toLinkColor(edge.confidence),
      weight: edge.frequency,
      lagDaysMin: edge.lagDaysMin ?? 0,
      avgLag: edge.avgLag ?? 0,
    }));
  }, [cycleEdges]);

  const adjacency = useMemo(() => buildAdjacency(linkDataArray), [linkDataArray]);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(null);
  const [hoveredCycleIndex, setHoveredCycleIndex] = useState<number | null>(null);
  const [pairFrom, setPairFrom] = useState<string>("");
  const [pairTo, setPairTo] = useState<string>("");
  const [pairPaths, setPairPaths] = useState<string[][]>([]);
  const [fromTotals, setFromTotals] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (status !== "authed") {
      setCycleEdges([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch<{ cycles: CycleEdge[] }>("/derived/cycles?rangeKey=all_time")
      .then((response) => {
        setCycleEdges(response.cycles || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load cycles.");
        setCycleEdges([]);
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    if (!nodeDataArray.length) return;
    setPairFrom((prev) => prev || nodeDataArray[0].key);
    setPairTo((prev) => prev || nodeDataArray[Math.min(1, nodeDataArray.length - 1)].key);
  }, [nodeDataArray]);

  const handleNodeSelection = useCallback((nodeKey: string) => {
    setCycles([]);
    setSelection((prev) => {
      const { primary, comparison } = prev;
      if (!primary || comparison) {
        return { primary: nodeKey, comparison: null };
      }
      if (primary === nodeKey) {
        return { primary: null, comparison: null };
      }
      return { primary, comparison: nodeKey };
    });
  }, []);

  useEffect(() => {
    if (!showAdvanced || !diagramRef.current || nodeDataArray.length === 0) {
      return;
    }

    const $ = go.GraphObject.make;
    diagramInstance.current = $(go.Diagram, diagramRef.current, {
      "undoManager.isEnabled": true,
      initialContentAlignment: go.Spot.Center,
      autoScale: go.Diagram.Uniform,
      layout: $(go.LayeredDigraphLayout, {
        direction: 90,
        isInitial: false,
        isOngoing: false,
        layerSpacing: 120,
        columnSpacing: 60,
      }),
      "toolManager.hoverDelay": 100,
    });

    diagramInstance.current.nodeTemplate = $(
      go.Node,
      "Auto",
      {
        cursor: "pointer",
        click: (_, obj) => {
          const nodeKey = obj.part?.data.key;
          if (nodeKey) {
            handleNodeSelection(nodeKey);
          }
        },
        mouseEnter: (_, obj) => (obj.part!.isShadowed = true),
        mouseLeave: (_, obj) => (obj.part!.isShadowed = false),
      },
      $(
        go.Shape,
        "RoundedRectangle",
        {
          strokeWidth: 1,
          fill: CARD_COLOR,
          portId: "",
          fromLinkable: true,
          toLinkable: true,
          fromSpot: go.Spot.AllSides,
          toSpot: go.Spot.AllSides,
        },
        new go.Binding("figure", "kind", (kind) => (kind === "context" ? "Rectangle" : "RoundedRectangle")),
        new go.Binding("fill", "", (data, obj) => {
          if (obj.part?.isHighlighted) return TEXT_COLOR;
          if (data.kind === "context") return "#f1f5f9";
          if (data.kind === "impact") return "#f8fafc";
          return CARD_COLOR;
        }),
        new go.Binding("stroke", "kind", (kind) => {
          if (kind === "context") return "#94a3b8";
          if (kind === "impact") return "#475569";
          return "transparent";
        }),
        new go.Binding("strokeDashArray", "kind", (kind) => (kind === "context" ? [4, 3] : null)),
        new go.Binding("stroke", "data.isIntermediateHighlighted", (h) => (h ? "lightblue" : "transparent")).ofObject(),
        new go.Binding("strokeWidth", "data.isIntermediateHighlighted", (h) => (h ? 5 : 0)).ofObject(),
      ),
      $(
        go.TextBlock,
        {
          font: "bold 12px 'Inter'",
          stroke: TEXT_COLOR,
          margin: 8,
          wrap: go.TextBlock.WrapFit,
          width: 120,
        },
        new go.Binding("text", "text"),
        new go.Binding("stroke", "isHighlighted", (s) => (s ? "white" : TEXT_COLOR)).ofObject(),
        new go.Binding("font", "isHighlighted", (s) => (s ? "bold 12px 'Inter'" : "12px 'Inter'")).ofObject(),
      ),
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    );

    diagramInstance.current.linkTemplate = $(
      go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.Bezier,
        layerName: "Background",
        corner: 10,
      },
      $(
        go.Shape,
        { isPanelMain: true },
        new go.Binding("stroke", "", (data, obj) => {
          const isHighlighted = obj.part?.isHighlighted;
          return isHighlighted ? "lightblue" : data.color || BASE_LINE_COLOR;
        }).ofObject(),
        new go.Binding("strokeWidth", "", (data, obj) => {
          const isHighlighted = obj.part?.isHighlighted;
          if (isHighlighted) return 8;
          const weight = Math.max(1, Math.min(6, data.weight || 1));
          return weight;
        }).ofObject(),
        new go.Binding("strokeDashArray", "avgLag", (lag) => (lag > 1 ? [4, 3] : null)),
      ),
      $(
        go.Shape,
        { toArrow: "Standard", stroke: null, fill: TEXT_COLOR, scale: 0.75 },
      ),
      $(
        go.Panel,
        "Auto",
        { segmentFraction: 0.66 },
        $(go.Shape, "RoundedRectangle", {
          fill: "white",
          stroke: "#e2e8f0",
          strokeWidth: 1,
        }),
        $(
          go.TextBlock,
          {
            margin: new go.Margin(2, 6, 2, 6),
            font: "10px 'Inter'",
            stroke: "#64748b",
          },
          new go.Binding("text", "avgLag", (lag) => {
            if (!lag || lag < 0.5) return "Same day";
            return `+ ${lag}d`;
          }),
        ),
      ),
    );

    diagramInstance.current.model = new go.GraphLinksModel(
      nodeDataArray.map((node) => ({ ...node })),
      linkDataArray.map((link) => ({ ...link })),
    );

    return () => {
      if (diagramInstance.current) {
        diagramInstance.current.div = null;
        diagramInstance.current = null;
      }
    };
  }, [handleNodeSelection, showAdvanced, nodeDataArray, linkDataArray]);

  useEffect(() => {
    const { primary, comparison } = selection;
    if (!primary) {
      setCycles([]);
      return;
    }

    const target = comparison ?? primary;
    const maxDepth = 8;
    const results: string[][] = [];
    const seen = new Set<string>();

    const traverse = (current: string, path: string[], visited: Set<string>) => {
      if (path.length > maxDepth) return;
      const neighbors = adjacency.get(current) ?? [];
      neighbors.forEach((neighbor) => {
        if (neighbor === target) {
          if (comparison || path.length > 1) {
            const candidate = [...path, neighbor];
            const key = candidate.join("->");
            if (!seen.has(key)) {
              seen.add(key);
              results.push(candidate);
            }
          }
        } else if (!visited.has(neighbor)) {
          visited.add(neighbor);
          traverse(neighbor, [...path, neighbor], visited);
          visited.delete(neighbor);
        }
      });
    };

    traverse(primary, [primary], new Set([primary]));
    setCycles(results);
    setSelectedCycleIndex(null);
    setHoveredCycleIndex(null);
  }, [selection, adjacency]);

  const primaryNode = nodeDataArray.find((node) => node.key === selection.primary);
  const comparisonNode = nodeDataArray.find((node) => node.key === selection.comparison);
  const activeCycle = useMemo(() => {
    const index = hoveredCycleIndex ?? selectedCycleIndex;
    if (index === null) return null;
    return cycles[index] ?? null;
  }, [cycles, hoveredCycleIndex, selectedCycleIndex]);

  const stats = useMemo(() => {
    if (!cycles.length) {
      return {
        total: 0,
        longest: "—",
        shortest: "—",
        averageLength: "—",
        mostFrequent: "—",
        leastFrequent: "—",
        nodesWithoutPaths: nodeDataArray.map((n) => n.text).join(", "),
        diversity: "—",
      };
    }

    const nodeKeyToText = Object.fromEntries(nodeDataArray.map((node) => [node.key, node.text]));
    let longest = cycles[0];
    let shortest = cycles[0];
    let totalLength = 0;
    const frequency: Record<string, number> = {};
    const uniqueNodes = new Set<string>();

    const describe = (path: string[]) => path.map((key) => nodeKeyToText[key] ?? key).join(" → ");

    cycles.forEach((cycle) => {
      totalLength += cycle.length;
      if (cycle.length > longest.length) longest = cycle;
      if (cycle.length < shortest.length) shortest = cycle;
      cycle.forEach((key) => {
        frequency[key] = (frequency[key] ?? 0) + 1;
        uniqueNodes.add(key);
      });
    });

    const entries = Object.entries(frequency);
    const mostFrequent = entries.reduce((acc, curr) => (curr[1] > acc[1] ? curr : acc), entries[0])[0];
    const leastFrequent = entries.reduce((acc, curr) => (curr[1] < acc[1] ? curr : acc), entries[0])[0];

    const nodesWithoutPaths = nodeDataArray
      .filter((node) => !uniqueNodes.has(node.key))
      .map((node) => node.text)
      .join(", ");

    return {
      total: cycles.length,
      longest: describe(longest),
      shortest: describe(shortest),
      averageLength: (totalLength / cycles.length).toFixed(2),
      mostFrequent: nodeKeyToText[mostFrequent] ?? "-",
      leastFrequent: nodeKeyToText[leastFrequent] ?? "-",
      nodesWithoutPaths: nodesWithoutPaths || "All nodes participate",
      diversity: uniqueNodes.size.toString(),
    };
  }, [cycles, nodeDataArray]);

  const highlightGraph = useCallback(() => {
    const diagram = diagramInstance.current;
    if (!diagram) return;

    const nodeKeysToHighlight = new Set<string>();
    const linkKeysToHighlight = new Set<string>();

    if (selection.primary) nodeKeysToHighlight.add(selection.primary);
    if (selection.comparison) nodeKeysToHighlight.add(selection.comparison);

    const activeIndex = hoveredCycleIndex ?? selectedCycleIndex;

    if (activeIndex !== null && cycles[activeIndex]) {
      const cycle = cycles[activeIndex];
      cycle.forEach((key, idx) => {
        nodeKeysToHighlight.add(key);
        if (idx < cycle.length - 1) {
          const from = cycle[idx];
          const to = cycle[idx + 1];
          linkKeysToHighlight.add(`${from}->${to}`);
        }
      });
    }

    diagram.startTransaction("highlight");
    diagram.clearHighlighteds();

    nodeKeysToHighlight.forEach((key) => {
      const node = diagram.findNodeForKey(key);
      if (node) node.isHighlighted = true;
    });

    diagram.links.each((link) => {
      const key = `${link.data.from}->${link.data.to}`;
      link.isHighlighted = linkKeysToHighlight.has(key);
    });

    diagram.commitTransaction("highlight");
  }, [selection, cycles, selectedCycleIndex, hoveredCycleIndex]);

  useEffect(() => {
    highlightGraph();
  }, [highlightGraph]);

  const helperMessage = useMemo(() => {
    if (!selection.primary) return "Click any box in the graph to get started.";
    if (selection.primary && !selection.comparison) {
      return "Select a second box to explore every route between them, or tap cycles below to highlight paths.";
    }
    return "Review the list to highlight each unique path connecting your two selections.";
  }, [selection]);

  const nodeKeyToText = useMemo(
    () => Object.fromEntries(nodeDataArray.map((node) => [node.key, node.text])),
    [nodeDataArray],
  );

  useEffect(() => {
    if (!pairFrom) return;
    const allPaths = gatherPaths(pairFrom, adjacency);
    const filtered = pairTo ? allPaths.filter((path) => path[path.length - 1] === pairTo) : [];
    setPairPaths(filtered);
    setFromTotals(allPaths.length);
  }, [pairFrom, pairTo, adjacency]);

  const pairPercent = useMemo(() => {
    if (!fromTotals || !pairFrom) return 0;
    return Math.min(100, Math.round((pairPaths.length / fromTotals) * 100));
  }, [pairPaths, fromTotals, pairFrom]);

  const suggestionMatrix: Record<string, string> = {
    "I->M": "When Anxiety feeds Perfectionism, pause to name a win from today before bed.",
    "I->N": "If Anxiety spirals into Overwhelm, anchor yourself with a breathing ritual.",
    "J->F": "When Depression strains relationships, prep a gentle script for difficult talks.",
    "E->I": "Poor working memory leading to Anxiety? Capture thoughts in a single sentence summary.",
  };

  const activeSuggestion = useMemo(() => {
    if (!pairFrom || !pairTo) return "Pick a pair to surface tailored reflections.";
    const key = `${pairFrom}->${pairTo}`;
    const custom = suggestionMatrix[key];
    const defaultMessage = `Notice how ${nodeKeyToText[pairFrom]} often links to ${nodeKeyToText[pairTo]}. Try journaling what happens in between and rehearse an exit cue.`;
    return custom ?? defaultMessage;
  }, [pairFrom, pairTo, suggestionMatrix, nodeKeyToText]);

  const hasData = nodeDataArray.length > 0;

  return (
    <div className="space-y-10 text-slate-900">
      <PageHeader
        eyebrow="Quick intel"
        title="Issue Pair Explorer"
        description="Compare two issues at a glance. We’ll surface how often they appear together, show common paths, and prompt an intervention."
        actions={(
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Button variant="secondary" size="sm" onClick={() => setShowAdvanced((prev) => !prev)}>
              {showAdvanced ? "Hide deeper analysis" : "Open deeper analysis"}
            </Button>
            <div className="flex gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">From</p>
                <select
                  className="mt-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={pairFrom}
                  onChange={(e) => setPairFrom(e.target.value)}
                  disabled={!hasData}
                >
                  {nodeDataArray.map((node) => (
                    <option key={node.key} value={node.key}>
                      {node.text}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">To</p>
                <select
                  className="mt-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={pairTo}
                  onChange={(e) => setPairTo(e.target.value)}
                  disabled={!hasData}
                >
                  {nodeDataArray
                    .filter((node) => node.key !== pairFrom)
                    .map((node) => (
                      <option key={node.key} value={node.key}>
                        {node.text}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}
      >
        {loading ? (
          <Card className="mb-4 p-4 text-sm text-slate-500">Loading cycles…</Card>
        ) : error ? (
          <Card className="mb-4 p-4 text-sm text-rose-600">{error}</Card>
        ) : !hasData ? (
          <Card className="mb-4 p-4 text-sm text-slate-500">
            No cycles detected yet. Generate more entries or rebuild derived data.
          </Card>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Frequency</p>
            <h3 className="mt-3 text-3xl font-semibold text-brand">{pairPaths.length}</h3>
            <p className="text-sm text-slate-500">
              {pairPercent}% of paths starting at {nodeKeyToText[pairFrom] || "—"}
            </p>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Top paths</p>
            {pairPaths.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {pairPaths.slice(0, 3).map((path, idx) => (
                  <div key={`${path.join("-")}-${idx}`} className="flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm text-brand">
                    {path.map((nodeKey, i) => (
                      <span key={`${nodeKey}-${i}`} className="flex items-center">
                        {nodeKeyToText[nodeKey] ?? nodeKey}
                        {i < path.length - 1 && <span className="px-1 text-slate-400">→</span>}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">We haven’t seen this pair connect yet. Try another combination.</p>
            )}
          </Card>
        </div>

        <div className="mt-6 rounded-3xl border border-brand/10 bg-brand/5 p-5">
          <p className="text-xs uppercase tracking-[0.4em] text-brand/70">Suggested intervention</p>
          <p className="mt-2 text-sm text-slate-600">{activeSuggestion}</p>
        </div>
      </PageHeader>

      {showAdvanced && (
        <>
          <section className="rounded-3xl border border-brand/15 bg-gradient-to-br from-white via-white to-brand/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-brand/60">MindStorm network</p>
                <h1 className="mt-2 text-3xl font-semibold text-brand">Cycles tracker</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Tap a box to set the starting point. Tap another to compare loops between them—every connection mirrors the original MindStorm map.
                </p>
              </div>
              <Button variant="secondary" onClick={() => diagramInstance.current?.zoomToFit()}>
                Fit to screen
              </Button>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-100 p-4">
              <div ref={diagramRef} className="h-[460px] w-full" />
            </div>
          </section>

          <section className="space-y-6 rounded-3xl border border-brand/15 p-6">
            <div className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600">
              <p className="font-semibold text-brand">How to use this map</p>
              <p className="mt-2 leading-relaxed">
                Select one issue to explore its internal loops. Select a second to surface every path between the two. Hover or click any path in the list to
                highlight it on the graph, just like the legacy MindStorm experience.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <Card className="p-6 text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-brand">
                      {selection.comparison ? "Cycles between nodes" : "Cycles within node"} ({cycles.length})
                    </h2>
                    <p className="text-sm text-slate-500">{helperMessage}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!primaryNode && !comparisonNode}
                    onClick={() => {
                      setSelection({ primary: null, comparison: null });
                      setCycles([]);
                      setSelectedCycleIndex(null);
                      setHoveredCycleIndex(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Primary</p>
                    <p className="mt-1 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-brand">
                      {primaryNode ? primaryNode.text : "Tap any node to choose a starting point."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Comparison</p>
                    <p className="mt-1 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-brand">
                      {comparisonNode ? comparisonNode.text : "Select a second node (optional)."}
                    </p>
                  </div>
                </div>
                <div className="ms-glass-surface mt-6 h-72 overflow-y-auto rounded-2xl border p-3">
                  {cycles.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      {selection.primary
                        ? "No cycles detected for the current selection yet."
                        : "Select node(s) on the graph to list their cycles."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cycles.map((cycle, index) => (
                        <button
                          key={`${cycle.join("-")}-${index}`}
                          onClick={() => setSelectedCycleIndex(index)}
                          onMouseEnter={() => setHoveredCycleIndex(index)}
                          onMouseLeave={() => setHoveredCycleIndex(null)}
                          className={`flex w-full flex-wrap items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                            (hoveredCycleIndex ?? selectedCycleIndex) === index
                              ? "bg-brand/10 text-brand shadow-inner"
                              : "text-brand hover:bg-white"
                          }`}
                        >
                          {cycle.map((label, idx) => (
                            <span key={`${label}-${idx}`} className="flex items-center">
                              <span className="rounded-full px-3 py-1 text-xs font-semibold text-brand">
                                {nodeDataArray.find((node) => node.key === label)?.text ?? label}
                              </span>
                              {idx < cycle.length - 1 && <span className="px-2 text-slate-400">→</span>}
                            </span>
                          ))}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 text-slate-700">
                <h2 className="text-lg font-semibold text-brand">Cycle metrics</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Total paths</dt>
                    <dd className="font-semibold text-brand">{stats.total}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Longest path</dt>
                    <dd className="font-semibold text-brand">{stats.longest}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Shortest path</dt>
                    <dd className="font-semibold text-brand">{stats.shortest}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Average length</dt>
                    <dd className="font-semibold text-brand">{stats.averageLength}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Most frequent node</dt>
                    <dd className="font-semibold text-brand">{stats.mostFrequent}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Least frequent node</dt>
                    <dd className="font-semibold text-brand">{stats.leastFrequent}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Nodes without paths</dt>
                    <dd className="font-semibold text-brand">{stats.nodesWithoutPaths}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.4em] text-slate-400">Path diversity</dt>
                    <dd className="font-semibold text-brand">{stats.diversity}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            <div className="rounded-3xl border border-brand/15 p-6">
              <h2 className="text-lg font-semibold text-brand">Selected path diagram</h2>
              {activeCycle ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeCycle.map((key, idx) => (
                    <span key={`${key}-${idx}`} className="flex items-center">
                      <span className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
                        {nodeDataArray.find((node) => node.key === key)?.text ?? key}
                      </span>
                      {idx < activeCycle.length - 1 && <span className="px-2 text-slate-400">→</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Hover or click a cycle to render its path here, similar to the original HTML diagram.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default CyclesGraphPage;
