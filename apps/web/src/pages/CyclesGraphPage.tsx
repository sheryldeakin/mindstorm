import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as go from "gojs";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import PageHeader from "../components/layout/PageHeader";

type NodeData = { key: string; text: string; color: string; loc: string };
type LinkData = { from: string; to: string; color: string };

const CARD_COLOR = "#dad9d9";
const TEXT_COLOR = "#122F41";
const BASE_LINE_COLOR = "#d3d3d3";

const nodeDataArray: NodeData[] = [
  { key: "A", text: "No Inner Monologue", color: CARD_COLOR, loc: "50 10" },
  { key: "B", text: "Aphantasia", color: CARD_COLOR, loc: "250 10" },
  { key: "C", text: "Childhood Trauma", color: CARD_COLOR, loc: "700 10" },
  { key: "D", text: "Trauma", color: CARD_COLOR, loc: "900 10" },
  { key: "E", text: "Poor Working Memory", color: CARD_COLOR, loc: "150 100" },
  { key: "F", text: "Interpersonal Relationship Issues", color: CARD_COLOR, loc: "750 100" },
  { key: "G", text: "Dyslexia", color: CARD_COLOR, loc: "800 250" },
  { key: "H", text: "ADHD", color: CARD_COLOR, loc: "600 250" },
  { key: "I", text: "Anxiety", color: CARD_COLOR, loc: "400 250" },
  { key: "J", text: "Depression", color: CARD_COLOR, loc: "200 250" },
  { key: "K", text: "Poor Emotional/Mood Regulation\n  Substance Abuse/Addiction\n  Impulsivity", color: CARD_COLOR, loc: "450 400" },
  { key: "L", text: "Objectivity/\nAbsolute Thinking", color: CARD_COLOR, loc: "100 500" },
  { key: "M", text: "Perfectionism\n  High Expectations", color: CARD_COLOR, loc: "850 500" },
  { key: "N", text: "Overwhelmed\n  Frustrated\n  Confused", color: CARD_COLOR, loc: "500 600" },
];

const linkDataArray: LinkData[] = [
  { from: "A", to: "E", color: TEXT_COLOR },
  { from: "A", to: "G", color: TEXT_COLOR },
  { from: "B", to: "E", color: TEXT_COLOR },
  { from: "C", to: "F", color: TEXT_COLOR },
  { from: "C", to: "I", color: TEXT_COLOR },
  { from: "C", to: "J", color: TEXT_COLOR },
  { from: "D", to: "F", color: TEXT_COLOR },
  { from: "D", to: "I", color: TEXT_COLOR },
  { from: "D", to: "J", color: TEXT_COLOR },
  { from: "D", to: "N", color: TEXT_COLOR },
  { from: "E", to: "G", color: TEXT_COLOR },
  { from: "E", to: "H", color: TEXT_COLOR },
  { from: "E", to: "I", color: TEXT_COLOR },
  { from: "E", to: "J", color: TEXT_COLOR },
  { from: "E", to: "L", color: TEXT_COLOR },
  { from: "E", to: "N", color: TEXT_COLOR },
  { from: "F", to: "I", color: TEXT_COLOR },
  { from: "F", to: "J", color: TEXT_COLOR },
  { from: "F", to: "K", color: TEXT_COLOR },
  { from: "F", to: "M", color: TEXT_COLOR },
  { from: "G", to: "E", color: TEXT_COLOR },
  { from: "G", to: "H", color: TEXT_COLOR },
  { from: "G", to: "I", color: TEXT_COLOR },
  { from: "G", to: "J", color: TEXT_COLOR },
  { from: "G", to: "K", color: TEXT_COLOR },
  { from: "G", to: "L", color: TEXT_COLOR },
  { from: "G", to: "N", color: TEXT_COLOR },
  { from: "H", to: "E", color: TEXT_COLOR },
  { from: "H", to: "F", color: TEXT_COLOR },
  { from: "H", to: "G", color: TEXT_COLOR },
  { from: "H", to: "I", color: TEXT_COLOR },
  { from: "H", to: "J", color: TEXT_COLOR },
  { from: "H", to: "K", color: TEXT_COLOR },
  { from: "H", to: "M", color: TEXT_COLOR },
  { from: "H", to: "N", color: TEXT_COLOR },
  { from: "I", to: "E", color: TEXT_COLOR },
  { from: "I", to: "F", color: TEXT_COLOR },
  { from: "I", to: "G", color: TEXT_COLOR },
  { from: "I", to: "H", color: TEXT_COLOR },
  { from: "I", to: "J", color: TEXT_COLOR },
  { from: "I", to: "K", color: TEXT_COLOR },
  { from: "I", to: "M", color: TEXT_COLOR },
  { from: "I", to: "N", color: TEXT_COLOR },
  { from: "J", to: "E", color: TEXT_COLOR },
  { from: "J", to: "F", color: TEXT_COLOR },
  { from: "J", to: "G", color: TEXT_COLOR },
  { from: "J", to: "H", color: TEXT_COLOR },
  { from: "J", to: "I", color: TEXT_COLOR },
  { from: "J", to: "N", color: TEXT_COLOR },
  { from: "K", to: "F", color: TEXT_COLOR },
  { from: "K", to: "G", color: TEXT_COLOR },
  { from: "K", to: "H", color: TEXT_COLOR },
  { from: "K", to: "I", color: TEXT_COLOR },
  { from: "K", to: "N", color: TEXT_COLOR },
  { from: "L", to: "E", color: TEXT_COLOR },
  { from: "L", to: "G", color: TEXT_COLOR },
  { from: "L", to: "J", color: TEXT_COLOR },
  { from: "L", to: "N", color: TEXT_COLOR },
  { from: "M", to: "F", color: TEXT_COLOR },
  { from: "M", to: "H", color: TEXT_COLOR },
  { from: "M", to: "I", color: TEXT_COLOR },
  { from: "M", to: "N", color: TEXT_COLOR },
  { from: "N", to: "E", color: TEXT_COLOR },
  { from: "N", to: "G", color: TEXT_COLOR },
  { from: "N", to: "H", color: TEXT_COLOR },
  { from: "N", to: "I", color: TEXT_COLOR },
  { from: "N", to: "J", color: TEXT_COLOR },
];

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
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const diagramInstance = useRef<go.Diagram | null>(null);
  const [selection, setSelection] = useState<{ primary: string | null; comparison: string | null }>({
    primary: null,
    comparison: null,
  });
  const adjacency = useMemo(() => buildAdjacency(linkDataArray), []);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(null);
  const [hoveredCycleIndex, setHoveredCycleIndex] = useState<number | null>(null);
  const [pairFrom, setPairFrom] = useState<string>(nodeDataArray[0].key);
  const [pairTo, setPairTo] = useState<string>(nodeDataArray[1].key);
  const [pairPaths, setPairPaths] = useState<string[][]>([]);
  const [fromTotals, setFromTotals] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    if (!showAdvanced || !diagramRef.current) {
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
          strokeWidth: 0,
          fill: CARD_COLOR,
          portId: "",
          fromLinkable: true,
          toLinkable: true,
          fromSpot: go.Spot.AllSides,
          toSpot: go.Spot.AllSides,
        },
        new go.Binding("fill", "isHighlighted", (h, obj) => (h ? TEXT_COLOR : obj.part?.data.color ?? CARD_COLOR)).ofObject(),
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
        new go.Binding("stroke", "isHighlighted", (h) => (h ? "lightblue" : BASE_LINE_COLOR)).ofObject(),
        new go.Binding("strokeWidth", "isHighlighted", (h) => (h ? 8 : 1)).ofObject(),
      ),
      $(
        go.Shape,
        { toArrow: "Standard", stroke: null, fill: TEXT_COLOR, scale: 0.75 },
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
  }, [handleNodeSelection, showAdvanced]);

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
  }, [cycles]);

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

  const nodeKeyToText = useMemo(() => Object.fromEntries(nodeDataArray.map((node) => [node.key, node.text])), []);

  useEffect(() => {
    if (!pairFrom) return;
    const allPaths = gatherPaths(pairFrom, adjacency);
    const filtered = pairTo ? allPaths.filter((path) => path[path.length - 1] === pairTo) : [];
    setPairPaths(filtered);
    setFromTotals(allPaths.length);
  }, [pairFrom, pairTo, adjacency]);

  const pairPercent = useMemo(() => {
    if (!fromTotals) return 0;
    return Math.min(100, Math.round((pairPaths.length / fromTotals) * 100));
  }, [pairPaths, fromTotals]);

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
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Frequency</p>
            <h3 className="mt-3 text-3xl font-semibold text-brand">{pairPaths.length}</h3>
            <p className="text-sm text-slate-500">{pairPercent}% of paths starting at {nodeKeyToText[pairFrom]}</p>
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
