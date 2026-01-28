import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as go from "gojs";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import PageHeader from "../components/layout/PageHeader";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import { usePatientTranslation } from "../hooks/usePatientTranslation";
import FlowGraph, { type FlowEdge, type FlowNode } from "../components/features/FlowGraph";
import CycleCircuit from "../components/features/CycleCircuit";
import OrbitalCycle from "../components/features/OrbitalCycle";
import CycleStory from "../components/features/CycleStory";
import NestedCycleCard from "../components/features/NestedCycleCard";
import RichCycleCircuit, { type CycleEdgeDetail } from "../components/features/RichCycleCircuit";
import NeuralCircuit, {
  type NeuralCircuitEdge,
  type NeuralCircuitNode,
} from "../components/features/NeuralCircuit";
import { consolidateCycles, findAnchoredAttachments, findAttachments, findSimpleCycles } from "../lib/graphUtils";
import { useNeuralPathfinding } from "../hooks/useNeuralPathfinding";

type NodeData = {
  key: string;
  text: string;
  kind: "symptom" | "context" | "impact";
  group?: string;
};
type LinkData = {
  from: string;
  to: string;
  color: string;
  weight: number;
  lagDaysMin?: number;
  avgLag?: number;
  sourcePairs?: Array<{ from: string; to: string }>;
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

type GroupData = {
  key: string;
  text: string;
  color: string;
  loc?: string;
  isGroup: true;
};

const BASE_LINE_COLOR = "#d3d3d3";

const toLinkColor = (confidence: number) => {
  if (confidence >= 0.7) return "#0f172a";
  if (confidence >= 0.45) return "#334155";
  if (confidence >= 0.25) return "#64748b";
  return "#cbd5f5";
};

const normalizeLabelKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const getNodeKind = (label: string): NodeData["kind"] => {
  if (label.startsWith("CONTEXT_")) return "context";
  if (label.startsWith("IMPACT_")) return "impact";
  return "symptom";
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

const filterMeaningfulCycles = (
  cycles: string[][],
  nodeKindById: Map<string, NodeData["kind"]>,
  minLength = 3,
) =>
  cycles.filter((cycle) => {
    if (cycle.length < minLength) return false;
    const kinds = cycle.map((id) => nodeKindById.get(id));
    const hasExternal = kinds.includes("context") || kinds.includes("impact");
    const hasSymptom = kinds.includes("symptom");
    return hasExternal && hasSymptom;
  });

const CyclesGraphPage = () => {
  const { status } = useAuth();
  const { getPatientLabel } = usePatientTranslation();
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const diagramInstance = useRef<go.Diagram | null>(null);
  const [cycleEdges, setCycleEdges] = useState<CycleEdge[]>([]);
  const [minConfidence, setMinConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ primary: string | null; comparison: string | null }>({
    primary: null,
    comparison: null,
  });
  const [selectedEdge, setSelectedEdge] = useState<CycleEdge | null>(null);
  const filteredEdges = useMemo(
    () => cycleEdges.filter((edge) => edge.confidence >= minConfidence),
    [cycleEdges, minConfidence],
  );
  const graphData = useMemo(() => {
    const nodes = new Map<string, NodeData>();
    const kindWeights = new Map<string, Record<NodeData["kind"], number>>();
    const edges = new Map<
      string,
      CycleEdge & { sourcePairs: Array<{ from: string; to: string }> }
    >();

    const addKindWeight = (key: string, kind: NodeData["kind"], weight: number) => {
      const existing = kindWeights.get(key) ?? { context: 0, symptom: 0, impact: 0 };
      existing[kind] += weight;
      kindWeights.set(key, existing);
    };

    const ensureNode = (rawLabel: string, weight: number) => {
      const kind = getNodeKind(rawLabel);
      const patientLabel = getPatientLabel(rawLabel);
      const key = normalizeLabelKey(patientLabel);
      const existing = nodes.get(key);
      if (!existing) {
        nodes.set(key, {
          key,
          text: patientLabel,
          kind,
          group: kind,
        });
      } else if (patientLabel.trim().length < existing.text.trim().length) {
        nodes.set(key, { ...existing, text: patientLabel });
      }
      addKindWeight(key, kind, weight);
      return key;
    };

    filteredEdges.forEach((edge) => {
      const weight = edge.frequency || 1;
      const fromKey = ensureNode(edge.sourceNode, weight);
      const toKey = ensureNode(edge.targetNode, weight);
      if (fromKey === toKey) return;
      const key = `${fromKey}->${toKey}`;
      const existing = edges.get(key);
      if (!existing) {
        edges.set(key, {
          sourceNode: fromKey,
          targetNode: toKey,
          frequency: edge.frequency,
          confidence: edge.confidence,
          lagDaysMin: edge.lagDaysMin,
          avgLag: edge.avgLag,
          evidenceEntryIds: [...edge.evidenceEntryIds],
          sourcePairs: [{ from: edge.sourceNode, to: edge.targetNode }],
        });
        return;
      }

      const nextFrequency = existing.frequency + edge.frequency;
      const nextConfidence =
        (existing.confidence * existing.frequency + edge.confidence * edge.frequency) / nextFrequency;
      let nextAvgLag = existing.avgLag;
      if (existing.avgLag != null && edge.avgLag != null) {
        nextAvgLag =
          (existing.avgLag * existing.frequency + edge.avgLag * edge.frequency) / nextFrequency;
      } else if (existing.avgLag == null && edge.avgLag != null) {
        nextAvgLag = edge.avgLag;
      }
      const nextLag =
        existing.lagDaysMin == null
          ? edge.lagDaysMin
          : edge.lagDaysMin == null
            ? existing.lagDaysMin
            : Math.min(existing.lagDaysMin, edge.lagDaysMin);

      const evidenceIds = new Set(existing.evidenceEntryIds);
      edge.evidenceEntryIds.forEach((id) => evidenceIds.add(id));
      const sourcePairs = existing.sourcePairs.some(
        (pair) => pair.from === edge.sourceNode && pair.to === edge.targetNode,
      )
        ? existing.sourcePairs
        : [...existing.sourcePairs, { from: edge.sourceNode, to: edge.targetNode }];

      edges.set(key, {
        ...existing,
        frequency: nextFrequency,
        confidence: nextConfidence,
        avgLag: nextAvgLag,
        lagDaysMin: nextLag,
        evidenceEntryIds: Array.from(evidenceIds),
        sourcePairs,
      });
    });

    const nodeDataArray = Array.from(nodes.entries()).map(([key, node]) => {
      const weights = kindWeights.get(key) ?? { context: 0, symptom: 0, impact: 0 };
      let kind: NodeData["kind"] = node.kind;
      const entries = Object.entries(weights) as Array<[NodeData["kind"], number]>;
      entries.forEach(([candidate, value]) => {
        if (value > weights[kind]) {
          kind = candidate;
        }
      });
      return { ...node, kind, group: kind };
    });

    const mergedEdges = Array.from(edges.values());
    const linkDataArray = mergedEdges.map((edge) => ({
      from: edge.sourceNode,
      to: edge.targetNode,
      color: toLinkColor(edge.confidence),
      weight: edge.frequency,
      lagDaysMin: edge.lagDaysMin ?? 0,
      avgLag: edge.avgLag ?? 0,
      sourcePairs: edge.sourcePairs,
    }));

    return {
      nodeDataArray,
      mergedEdges,
      linkDataArray,
    };
  }, [filteredEdges, getPatientLabel]);

  const { nodeDataArray, mergedEdges, linkDataArray } = graphData;

  const groupDataArray = useMemo<GroupData[]>(
    () => [
      { key: "context", text: "Influences", color: "#f1f5f9", isGroup: true },
      { key: "symptom", text: "Core Experiences", color: "#ffffff", isGroup: true },
      { key: "impact", text: "Life Impact", color: "#f8fafc", isGroup: true },
    ],
    [],
  );

  const adjacency = useMemo(() => buildAdjacency(linkDataArray), [linkDataArray]);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(null);
  const [hoveredCycleIndex, setHoveredCycleIndex] = useState<number | null>(null);
  const [pairFrom, setPairFrom] = useState<string>("");
  const [pairTo, setPairTo] = useState<string>("");
  const [pairPaths, setPairPaths] = useState<string[][]>([]);
  const [fromTotals, setFromTotals] = useState<number>(0);
  const [orbitalSelection, setOrbitalSelection] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [orbitalPath, setOrbitalPath] = useState<string[]>([]);

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

  useEffect(() => {
    if (!selectedEdge) return;
    const stillVisible = mergedEdges.some(
      (edge) =>
        edge.sourceNode === selectedEdge.sourceNode && edge.targetNode === selectedEdge.targetNode,
    );
    if (!stillVisible) {
      setSelectedEdge(null);
    }
  }, [mergedEdges, selectedEdge]);

  const handleNodeSelection = useCallback((nodeKey: string) => {
    setSelectedEdge(null);
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

  useEffect(() => {
    if (!diagramRef.current || nodeDataArray.length === 0) {
      return;
    }

    const $ = go.GraphObject.make;
    diagramInstance.current = $(go.Diagram, diagramRef.current, {
      "undoManager.isEnabled": true,
      initialContentAlignment: go.Spot.Center,
      autoScale: go.Diagram.None,
      "toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
      layout: $(go.LayeredDigraphLayout, {
        direction: 0,
        layerSpacing: 60,
        columnSpacing: 24,
      }),
      "toolManager.hoverDelay": 100,
    });

    diagramInstance.current.groupTemplate = $(
      go.Group,
      "Auto",
      {
        layout: $(go.LayeredDigraphLayout, {
          direction: 90,
          layerSpacing: 12,
          columnSpacing: 8,
        }),
        selectable: false,
        computesBoundsAfterDrag: true,
        handlesDragDropForMembers: true,
        layerName: "Background",
      },
      $(
        go.Shape,
        "RoundedRectangle",
        {
          strokeWidth: 1,
          stroke: "#e2e8f0",
          fill: "#ffffff",
        },
        new go.Binding("fill", "color"),
      ),
      $(
        go.Panel,
        "Vertical",
        {
          padding: new go.Margin(8, 12, 12, 12),
        },
        $(
          go.TextBlock,
          {
            font: "600 12px 'Inter'",
            stroke: "#475569",
            margin: new go.Margin(0, 0, 8, 0),
          },
          new go.Binding("text", "text"),
        ),
        $(go.Placeholder, { padding: 4 }),
      ),
    );

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
          fill: "#dad9d9",
          portId: "",
          fromLinkable: true,
          toLinkable: true,
          fromSpot: go.Spot.AllSides,
          toSpot: go.Spot.AllSides,
        },
        new go.Binding("figure", "kind", (kind) => (kind === "context" ? "Rectangle" : "RoundedRectangle")),
        new go.Binding("fill", "", (data, obj) => {
          if (obj.part?.isHighlighted) return "#122F41";
          if (data.kind === "context") return "#f1f5f9";
          if (data.kind === "impact") return "#f8fafc";
          return "#dad9d9";
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
          stroke: "#122F41",
          margin: 8,
          wrap: go.TextBlock.WrapFit,
          width: 120,
        },
        new go.Binding("text", "text"),
        new go.Binding("stroke", "isHighlighted", (s) => (s ? "white" : "#122F41")).ofObject(),
        new go.Binding("font", "isHighlighted", (s) => (s ? "bold 12px 'Inter'" : "12px 'Inter'")).ofObject(),
      ),
    );

    diagramInstance.current.linkTemplate = $(
      go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.Bezier,
        layerName: "Foreground",
        corner: 10,
        click: (_, link) => {
          const data = link.data as LinkData | undefined;
          if (!data) return;
          const match = mergedEdges.find(
            (edge) => edge.sourceNode === data.from && edge.targetNode === data.to,
          );
          if (match) {
            setSelectedEdge(match);
          }
        },
        mouseEnter: (_, link) => {
          const highlight = link.findObject("HIGHLIGHT") as go.Shape | null;
          if (highlight) highlight.stroke = "rgba(59,130,246,0.2)";
        },
        mouseLeave: (_, link) => {
          const highlight = link.findObject("HIGHLIGHT") as go.Shape | null;
          if (highlight) highlight.stroke = "transparent";
        },
      },
      $(
        go.Shape,
        { isPanelMain: true, strokeWidth: 12, stroke: "transparent", name: "HIGHLIGHT" },
      ),
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
        { toArrow: "Standard", stroke: null, fill: "#122F41", scale: 0.75 },
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
      [...groupDataArray, ...nodeDataArray].map((node) => ({ ...node })),
      linkDataArray.map((link) => ({ ...link })),
    );
    diagramInstance.current.zoomToFit();

    const handleWheel = (event: WheelEvent) => {
      const diagram = diagramInstance.current;
      if (!diagram) return;
      event.preventDefault();
      const delta = Math.sign(event.deltaY);
      if (delta > 0) {
        diagram.commandHandler.decreaseZoom();
      } else if (delta < 0) {
        diagram.commandHandler.increaseZoom();
      }
    };

    diagramRef.current.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      diagramRef.current?.removeEventListener("wheel", handleWheel);
      if (diagramInstance.current) {
        diagramInstance.current.div = null;
        diagramInstance.current = null;
      }
    };
  }, [filteredEdges, groupDataArray, handleNodeSelection, linkDataArray, mergedEdges, nodeDataArray]);

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

  const highlightState = useMemo(() => {
    const nodeKeysToHighlight = new Set<string>();
    const linkKeysToHighlight = new Set<string>();
    const focusNodes = new Set<string>();
    const focusLinks = new Set<string>();

    if (selection.primary) {
      nodeKeysToHighlight.add(selection.primary);
      focusNodes.add(selection.primary);
    }
    if (selection.comparison) {
      nodeKeysToHighlight.add(selection.comparison);
      focusNodes.add(selection.comparison);
    }
    if (selectedEdge) {
      nodeKeysToHighlight.add(selectedEdge.sourceNode);
      nodeKeysToHighlight.add(selectedEdge.targetNode);
      linkKeysToHighlight.add(`${selectedEdge.sourceNode}->${selectedEdge.targetNode}`);
      focusNodes.add(selectedEdge.sourceNode);
      focusNodes.add(selectedEdge.targetNode);
      focusLinks.add(`${selectedEdge.sourceNode}->${selectedEdge.targetNode}`);
    }

    const activeIndex = hoveredCycleIndex ?? selectedCycleIndex;
    if (activeIndex !== null && cycles[activeIndex]) {
      const cycle = cycles[activeIndex];
      cycle.forEach((key, idx) => {
        nodeKeysToHighlight.add(key);
        focusNodes.add(key);
        if (idx < cycle.length - 1) {
          const from = cycle[idx];
          const to = cycle[idx + 1];
          linkKeysToHighlight.add(`${from}->${to}`);
          focusLinks.add(`${from}->${to}`);
        }
      });
    }

    if (selection.primary || selection.comparison) {
      linkDataArray.forEach((link) => {
        const isConnectedToPrimary =
          selection.primary && (link.from === selection.primary || link.to === selection.primary);
        const isConnectedToComparison =
          selection.comparison && (link.from === selection.comparison || link.to === selection.comparison);
        if (isConnectedToPrimary || isConnectedToComparison) {
          focusLinks.add(`${link.from}->${link.to}`);
          focusNodes.add(link.from);
          focusNodes.add(link.to);
        }
      });
    }

    return {
      highlightedNodes: nodeKeysToHighlight,
      highlightedEdges: linkKeysToHighlight,
      focusNodes,
      focusLinks,
    };
  }, [cycles, hoveredCycleIndex, linkDataArray, selectedCycleIndex, selectedEdge, selection]);

  useEffect(() => {
    const diagram = diagramInstance.current;
    if (!diagram) return;
    const { highlightedNodes, highlightedEdges, focusNodes, focusLinks } = highlightState;

    diagram.startTransaction("highlight");
    diagram.clearHighlighteds();

    highlightedNodes.forEach((key) => {
      const node = diagram.findNodeForKey(key);
      if (node) node.isHighlighted = true;
    });

    diagram.links.each((link) => {
      const key = `${link.data.from}->${link.data.to}`;
      link.isHighlighted = highlightedEdges.has(key);
    });

    diagram.nodes.each((node) => {
      const key = node.data?.key;
      node.opacity = focusNodes.size ? (focusNodes.has(key) ? 1 : 0.2) : 1;
    });
    diagram.links.each((link) => {
      const key = `${link.data.from}->${link.data.to}`;
      link.opacity = focusLinks.size ? (focusLinks.has(key) ? 1 : 0.15) : 1;
    });

    diagram.commitTransaction("highlight");
  }, [highlightState]);

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

  const circuitEdges = useMemo(
    () => linkDataArray.map((link) => ({ from: link.from, to: link.to, weight: link.weight })),
    [linkDataArray],
  );
  const nodeKindById = useMemo(
    () => new Map(nodeDataArray.map((node) => [node.key, node.kind])),
    [nodeDataArray],
  );
  const edgeWeightByKey = useMemo(() => {
    const map = new Map<string, number>();
    linkDataArray.forEach((link) => {
      map.set(`${link.from}->${link.to}`, link.weight);
    });
    return map;
  }, [linkDataArray]);
  const circuitCycles = useMemo(
    () => findSimpleCycles(circuitEdges).filter((cycle) => cycle.length >= 3),
    [circuitEdges],
  );
  const meaningfulCycles = useMemo(
    () => filterMeaningfulCycles(circuitCycles, nodeKindById, 3),
    [circuitCycles, nodeKindById],
  );
  const rankedCircuitCycles = useMemo(() => {
    const scored = circuitCycles.map((cycle) => {
      const weights = cycle.map((nodeId, idx) => {
        const nextId = cycle[(idx + 1) % cycle.length];
        return edgeWeightByKey.get(`${nodeId}->${nextId}`) ?? 0;
      });
      const strength = weights.length ? Math.min(...weights) : 0;
      return { cycle, strength };
    });
    scored.sort((a, b) => b.strength - a.strength);
    return scored;
  }, [circuitCycles, edgeWeightByKey]);

  const rankedMeaningfulCycles = useMemo(() => {
    const scored = meaningfulCycles.map((cycle) => {
      const weights = cycle.map((nodeId, idx) => {
        const nextId = cycle[(idx + 1) % cycle.length];
        return edgeWeightByKey.get(`${nodeId}->${nextId}`) ?? 0;
      });
      const strength = weights.length ? Math.min(...weights) : 0;
      return { cycle, strength };
    });
    scored.sort((a, b) => b.strength - a.strength);
    return scored;
  }, [meaningfulCycles, edgeWeightByKey]);

  const mainCycle = useMemo(
    () => rankedMeaningfulCycles[0]?.cycle ?? rankedCircuitCycles[0]?.cycle ?? [],
    [rankedMeaningfulCycles, rankedCircuitCycles],
  );
  const anchoredAttachments = useMemo(() => {
    if (!mainCycle.length) return { inputs: [], outputs: [] };
    const raw = findAnchoredAttachments(mainCycle, circuitEdges);
    return {
      inputs: raw.inputs.map((input) => ({
        id: input.id,
        label: nodeKeyToText[input.id] ?? input.id,
        linkedNodeId: input.targetId,
      })),
      outputs: raw.outputs.map((output) => ({
        id: output.id,
        label: nodeKeyToText[output.id] ?? output.id,
        linkedNodeId: output.sourceId,
      })),
    };
  }, [mainCycle, circuitEdges, nodeKeyToText]);

  const handleOrbitalNodeClick = useCallback(
    (id: string) => {
      setOrbitalSelection((prev) => {
        if (prev.start && !prev.end && prev.start !== id) {
          const paths = gatherPaths(prev.start, adjacency);
          const matches = paths.filter((path) => path[path.length - 1] === id);
          matches.sort((a, b) => a.length - b.length);
          setOrbitalPath(matches[0] ?? []);
          return { ...prev, end: id };
        }
        setOrbitalPath([]);
        return { start: id, end: null };
      });
    },
    [adjacency],
  );

  const buildCycleEdgeDetails = useCallback(
    (cycle: string[]): CycleEdgeDetail[] =>
      cycle.map((sourceId, idx) => {
        const targetId = cycle[(idx + 1) % cycle.length];
        const match = mergedEdges.find(
          (edge) => edge.sourceNode === sourceId && edge.targetNode === targetId,
        );
        const lagVal = match?.avgLag ?? 0;
        const lagText = lagVal < 0.5 ? "Same day" : `+${Math.round(lagVal)}d`;
        return {
          from: sourceId,
          to: targetId,
          confidence: match?.confidence ?? 0.5,
          weight: match?.frequency ?? 1,
          lagText,
        };
      }),
    [mergedEdges],
  );
  const storyCycles = useMemo(() => {
    const scored = meaningfulCycles
      .map((cycle) => {
        const weight = cycle.reduce((sum, nodeId, idx) => {
          const nextId = cycle[(idx + 1) % cycle.length];
          return sum + (edgeWeightByKey.get(`${nodeId}->${nextId}`) ?? 0);
        }, 0);
        return { cycle, strength: weight };
      })
      .sort((a, b) => b.strength - a.strength);

    const uniqueStories: typeof scored = [];
    const seenNodes = new Set<string>();
    scored.forEach((item) => {
      const overlap = item.cycle.filter((node) => seenNodes.has(node)).length;
      const overlapRatio = overlap / item.cycle.length;
      if (uniqueStories.length === 0 || overlapRatio < 0.6) {
        uniqueStories.push(item);
        item.cycle.forEach((node) => seenNodes.add(node));
      }
    });

    return uniqueStories.slice(0, 4);
  }, [meaningfulCycles, edgeWeightByKey]);

  const consolidatedGroups = useMemo(() => {
    return consolidateCycles(meaningfulCycles);
  }, [meaningfulCycles]);

  const visibleCycleCards = useMemo(() => {
    if (selection.primary) {
      return rankedMeaningfulCycles.filter(({ cycle }) => cycle.includes(selection.primary));
    }
    return rankedMeaningfulCycles.slice(0, 3);
  }, [rankedMeaningfulCycles, selection.primary]);

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
  const selectedEdgeSummary = useMemo(() => {
    if (!selectedEdge) return null;
    const fromText = nodeKeyToText[selectedEdge.sourceNode] ?? selectedEdge.sourceNode;
    const toText = nodeKeyToText[selectedEdge.targetNode] ?? selectedEdge.targetNode;
    const lagText =
      !selectedEdge.avgLag || selectedEdge.avgLag < 0.5 ? "Same day" : `+${selectedEdge.avgLag} days`;
    return {
      title: `${fromText} → ${toText}`,
      frequency: selectedEdge.frequency,
      lagText,
      evidenceCount: selectedEdge.evidenceEntryIds?.length ?? 0,
    };
  }, [selectedEdge, nodeKeyToText]);

  const flowNodes = useMemo<FlowNode[]>(
    () =>
      nodeDataArray.map((node) => ({
        id: node.key,
        label: node.text,
        type: node.kind,
      })),
    [nodeDataArray],
  );

  const flowEdges = useMemo<FlowEdge[]>(
    () =>
      linkDataArray.map((link) => ({
        from: link.from,
        to: link.to,
        weight: link.weight,
        color: link.color ?? BASE_LINE_COLOR,
        avgLag: link.avgLag,
        sourcePairs: link.sourcePairs,
      })),
    [linkDataArray],
  );

  const neuralNodes = useMemo<NeuralCircuitNode[]>(
    () =>
      nodeDataArray.map((node) => ({
        id: node.key,
        label: node.text,
        kind: node.kind,
      })),
    [nodeDataArray],
  );

  const neuralEdges = useMemo<NeuralCircuitEdge[]>(
    () =>
      linkDataArray.map((link) => ({
        from: link.from,
        to: link.to,
        weight: link.weight,
      })),
    [linkDataArray],
  );
  const { findPaths } = useNeuralPathfinding(neuralEdges);
  const [neuralSelection, setNeuralSelection] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });
  const [neuralPaths, setNeuralPaths] = useState<string[][]>([]);
  const [neuralActiveIndex, setNeuralActiveIndex] = useState<number | null>(null);

  const handleNeuralNodeClick = useCallback(
    (id: string) => {
      setNeuralSelection((prev) => {
        if (prev.start === id) {
          setNeuralPaths([]);
          setNeuralActiveIndex(null);
          return { start: null, end: null };
        }
        if (!prev.start) {
          setNeuralPaths(findPaths(id, id));
          setNeuralActiveIndex(null);
          return { start: id, end: null };
        }
        if (prev.start && !prev.end) {
          const found = findPaths(prev.start, id);
          setNeuralPaths(found);
          setNeuralActiveIndex(null);
          return { start: prev.start, end: id };
        }
        setNeuralPaths([]);
        setNeuralActiveIndex(null);
        return { start: id, end: null };
      });
    },
    [findPaths],
  );

  const activeNeuralPath =
    neuralActiveIndex === null ? null : neuralPaths[neuralActiveIndex] ?? null;

  return (
    <div className="w-full space-y-10 pb-20 text-slate-900">
      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Neural Circuit</p>
          <h1 className="text-3xl font-semibold text-brand">Active Neural Circuit</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Tap one node to surface its feedback loops, or tap two nodes to visualize all causal paths.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <NeuralCircuit
            nodes={neuralNodes}
            edges={neuralEdges}
            selection={neuralSelection}
            activePath={activeNeuralPath}
            onNodeClick={handleNeuralNodeClick}
            showPanel={false}
          />
          <div className="flex max-h-[560px] flex-col gap-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {neuralSelection.end ? "Connections Found" : "Pathfinder"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {!neuralSelection.start
                  ? "Tap a node to start tracing."
                  : !neuralSelection.end
                    ? "Tap a second node to connect them."
                    : `Found ${neuralPaths.length} paths.`}
              </p>
              {neuralSelection.start && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                  {[neuralSelection.start, neuralSelection.end]
                    .filter(Boolean)
                    .map((nodeId, idx) => (
                      <span
                        key={`${nodeId}-${idx}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
                      >
                        {nodeKeyToText[nodeId as string] ?? nodeId}
                      </span>
                    ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {neuralSelection.end && neuralPaths.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-xs text-slate-500">
                  No direct paths found between these nodes.
                </div>
              ) : null}
              {neuralPaths.map((path, idx) => (
                <button
                  key={`${path.join("->")}-${idx}`}
                  type="button"
                  onClick={() => setNeuralActiveIndex(idx)}
                  className={`w-full rounded-2xl border p-3 text-left text-xs transition-all ${
                    neuralActiveIndex === idx
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                  }`}
                >
                  <div className="font-semibold">Path {idx + 1} ({Math.max(path.length - 1, 0)} steps)</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                    {path.map((nodeId, index) => (
                      <span key={`${nodeId}-${index}`} className="flex items-center">
                        {index > 0 && <span className="mx-1 text-slate-300">→</span>}
                        {nodeKeyToText[nodeId] ?? nodeId}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="Quick intel"
        title="Issue Pair Explorer"
        description="Compare two issues at a glance. We’ll surface how often they appear together, show common paths, and prompt an intervention."
      >
        <details className="group rounded-3xl border border-slate-200 bg-white/70 p-5">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.4em] text-slate-400">
            Show analysis tools
          </summary>
          <div className="mt-4 space-y-6">
            {loading ? (
              <Card className="p-4 text-sm text-slate-500">Loading cycles…</Card>
            ) : error ? (
              <Card className="p-4 text-sm text-rose-600">{error}</Card>
            ) : !hasData ? (
              <Card className="p-4 text-sm text-slate-500">
                No cycles detected yet. Generate more entries or rebuild derived data.
              </Card>
            ) : null}
            <details className="rounded-3xl border border-slate-200 bg-white/70 p-5">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.4em] text-slate-400">
                Advanced filters
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">From</p>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Confidence</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs font-semibold text-slate-500">
                      {Math.round(minConfidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </details>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-5">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Cycle detail</p>
                {selectedEdgeSummary ? (
                  <>
                    <h3 className="mt-3 text-lg font-semibold text-brand">{selectedEdgeSummary.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Happened {selectedEdgeSummary.frequency} times · {selectedEdgeSummary.lagText}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Evidence entries: {selectedEdgeSummary.evidenceCount}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-3 text-lg font-semibold text-brand">Select a connection</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Tap a line in the graph to see strength, lag, and evidence counts.
                    </p>
                  </>
                )}
              </Card>
              <Card className="p-5 lg:col-span-2">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Top paths</p>
                {pairPaths.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pairPaths.slice(0, 3).map((path, idx) => (
                      <div
                        key={`${path.join("-")}-${idx}`}
                        className="flex max-w-full flex-wrap items-center rounded-full bg-slate-100 px-4 py-2 text-sm text-brand"
                      >
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
                  <p className="mt-3 text-sm text-slate-500">
                    We haven’t seen this pair connect yet. Try another combination.
                  </p>
                )}
              </Card>
            </div>

            <div className="rounded-3xl border border-brand/10 bg-brand/5 p-5">
              <p className="text-xs uppercase tracking-[0.4em] text-brand/70">Suggested intervention</p>
              <p className="mt-2 text-sm text-slate-600">{activeSuggestion}</p>
            </div>
          </div>
        </details>
      </PageHeader>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Cycle circuits</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-700">Linked cycles & chains</h2>
            <p className="mt-2 text-sm text-slate-500">
              Each circuit highlights a loop with its incoming triggers and outgoing impacts.
            </p>
          </div>
        </div>
        <div className="mt-6">
          {mainCycle.length === 0 ? (
            <Card className="p-4 text-sm text-slate-500">
              No cycles found yet. Add more entries or adjust the filters above.
            </Card>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold text-slate-800">Orbital circuit</h3>
                <p className="text-sm text-slate-500">
                  Tap any two nodes to trace the strongest path between them.
                </p>
              </div>
              <OrbitalCycle
                cycleNodes={mainCycle.map((id) => ({
                  id,
                  label: nodeKeyToText[id] ?? id,
                  kind: nodeKindById.get(id) ?? "symptom",
                }))}
                inputs={anchoredAttachments.inputs}
                outputs={anchoredAttachments.outputs}
                highlightedPath={orbitalPath}
                onNodeClick={handleOrbitalNodeClick}
                selection={orbitalSelection}
              />
            </div>
          )}
        </div>
        <div className="mt-6">
          {rankedMeaningfulCycles.length === 0 ? (
            <Card className="p-4 text-sm text-slate-500">
              No cycles found yet. Add more entries or adjust the filters above.
            </Card>
          ) : (
            rankedMeaningfulCycles.slice(0, 1).map(({ cycle }, idx) => {
              const attachments = findAttachments(cycle, circuitEdges);
              const cycleNodes = cycle.map((id) => ({
                id,
                label: nodeKeyToText[id] ?? id,
                kind: nodeKindById.get(id) ?? "symptom",
              }));
              const edges = buildCycleEdgeDetails(cycle);
              const avgWeight = Math.round(
                edges.reduce((sum, edge) => sum + (edge.weight || 0), 0) / edges.length,
              );
              const inputs = attachments.inputs.map((id) => ({
                id,
                label: nodeKeyToText[id] ?? id,
              }));
              const outputs = attachments.outputs.map((id) => ({
                id,
                label: nodeKeyToText[id] ?? id,
              }));
              return (
                <div key={`rich-${cycle.join("-")}-${idx}`} className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-semibold text-slate-800">Dominant cycle</h3>
                    <p className="text-sm text-slate-500">
                      This pattern repeats every {avgWeight || 1} days on average.
                    </p>
                  </div>
                  <RichCycleCircuit
                    cycleNodes={cycleNodes}
                    edges={edges}
                    inputs={inputs}
                    outputs={outputs}
                    onEdgeClick={(from, to) => {
                      const match = mergedEdges.find(
                        (edge) => edge.sourceNode === from && edge.targetNode === to,
                      );
                      if (match) setSelectedEdge(match);
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
        <div className="mt-6 flex flex-col gap-6">
          {visibleCycleCards.length === 0 ? (
            <Card className="p-4 text-sm text-slate-500">
              No cycles found yet. Add more entries or adjust the filters above.
            </Card>
          ) : (
            visibleCycleCards.map(({ cycle }, idx) => {
              const attachments = findAttachments(cycle, circuitEdges);
              const cycleNodes = cycle.map((id) => ({
                id,
                label: nodeKeyToText[id] ?? id,
              }));
              const inputs = attachments.inputs.map((id) => ({
                id,
                label: nodeKeyToText[id] ?? id,
              }));
              const outputs = attachments.outputs.map((id) => ({
                id,
                label: nodeKeyToText[id] ?? id,
              }));
              return (
                <CycleCircuit
                  key={`${cycle.join("-")}-${idx}`}
                  cycleNodes={cycleNodes}
                  inputs={inputs}
                  outputs={outputs}
                  onBreakCycle={(source, target) => {
                    setSelection({ primary: source, comparison: target });
                  }}
                />
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <details className="group">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
            <span className="uppercase tracking-[0.4em] text-slate-400">Alternative cycle views</span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
              Open / close
            </span>
          </summary>
          <div className="mt-6 space-y-6">
            <section className="rounded-3xl border border-brand/15 bg-gradient-to-br from-white via-white to-brand/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-brand/60">MindStorm network</p>
                  <h1 className="mt-2 text-3xl font-semibold text-brand">Cycles tracker</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Tap a box to set the starting point. Tap another to compare loops between them—every connection mirrors the original MindStorm map.
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/60 p-6">
                <FlowGraph
                  nodes={flowNodes}
                  edges={flowEdges}
                  highlightedNodeIds={highlightState.highlightedNodes}
                  highlightedEdgeIds={highlightState.highlightedEdges}
                  focusNodeIds={highlightState.focusNodes}
                  focusEdgeIds={highlightState.focusLinks}
                  onNodeClick={handleNodeSelection}
                  onEdgeClick={(edge) => {
                    const match = mergedEdges.find(
                      (item) => item.sourceNode === edge.from && item.targetNode === edge.to,
                    );
                    if (match) {
                      setSelectedEdge(match);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Legacy view</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-700">GoJS graph</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Reference layout for development parity while the new flow graph is tuned.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => diagramInstance.current?.commandHandler.increaseZoom()}
                  >
                    Zoom in
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => diagramInstance.current?.commandHandler.decreaseZoom()}
                  >
                    Zoom out
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => diagramInstance.current?.zoomToFit()}>
                    Fit to screen
                  </Button>
                </div>
              </div>
              <div className="mt-6 rounded-3xl border border-slate-100 p-4">
                <div ref={diagramRef} className="h-[70vh] w-full min-h-[460px]" />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Cycle stories</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-700">Narrative strips</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Focused loops with a clear trigger-to-experience story and a gentle return.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-6">
                {storyCycles.length === 0 ? (
                  <Card className="p-4 text-sm text-slate-500">
                    No narrative loops met the filter yet. Try lowering the confidence filter above.
                  </Card>
                ) : (
                  storyCycles.map(({ cycle, strength }, idx) => {
                    const nodes = cycle.map((id) => ({
                      id,
                      label: nodeKeyToText[id] ?? id,
                      type: nodeKindById.get(id) ?? "symptom",
                    }));
                    return <CycleStory key={`${cycle.join("-")}-${idx}`} nodes={nodes} frequency={strength} />;
                  })
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Nested patterns</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-700">Consolidated cycles</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Longer loops with their internal shortcut cycles grouped beneath.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-6">
                {consolidatedGroups.length === 0 ? (
                  <Card className="p-4 text-sm text-slate-500">
                    No consolidated cycles detected yet.
                  </Card>
                ) : (
                  consolidatedGroups.slice(0, 3).map((group, idx) => (
                    <NestedCycleCard
                      key={`${group.parent.join("-")}-${idx}`}
                      parentCycle={group.parent}
                      subLoops={group.subLoops}
                      nodeLabels={nodeKeyToText}
                      nodeKinds={Object.fromEntries(nodeKindById.entries())}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </details>
      </section>

      <section className="space-y-6 rounded-3xl border border-brand/15 p-6">
        <div className="ms-glass-surface rounded-2xl border p-4 text-sm text-slate-600">
          <p className="font-semibold text-brand">How to use this map</p>
          <p className="mt-2 leading-relaxed">
            Select one issue to explore its internal loops. Select a second to surface every path between the two.
            Hover or click any path in the list to highlight it on the graph, just like the legacy MindStorm experience.
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
    </div>
  );
};

export default CyclesGraphPage;
