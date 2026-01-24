import type { ThemeSeries } from "@mindstorm/derived-spec";
import type { EvidenceUnit, JournalEntry } from "../types/journal";
import { getPatientLabel } from "./patientSignals";

export type ConnectionNode = {
  id: string;
  label: string;
  type: "context" | "symptom" | "impact";
};

export type ConnectionEdge = {
  from: string;
  to: string;
  weight: number;
};

export type EntrySignal = {
  dateISO: string;
  evidenceUnits: EvidenceUnit[];
};

const restrictedCodes = new Set(["SYMPTOM_RISK", "SYMPTOM_TRAUMA"]);
const impactKeywordMap: Record<string, string> = {
  work: "IMPACT_WORK",
  job: "IMPACT_WORK",
  school: "IMPACT_WORK",
  study: "IMPACT_WORK",
  social: "IMPACT_SOCIAL",
  friend: "IMPACT_SOCIAL",
  friends: "IMPACT_SOCIAL",
  family: "IMPACT_SOCIAL",
  partner: "IMPACT_SOCIAL",
  relationship: "IMPACT_SOCIAL",
  sleep: "IMPACT_SELF_CARE",
  health: "IMPACT_SELF_CARE",
  routine: "IMPACT_SELF_CARE",
  self: "IMPACT_SELF_CARE",
  care: "IMPACT_SELF_CARE",
};

const normalizeCode = (value: string) => {
  if (!value) return "";
  const trimmed = value.includes(":") ? value.split(":")[0] : value;
  return trimmed.trim().toUpperCase();
};

export const isRestrictedLabel = (value: string) => restrictedCodes.has(normalizeCode(value));

export const filterPatientSafeGraph = (nodes: ConnectionNode[], edges: ConnectionEdge[]) => {
  const allowedNodeIds = new Set(
    nodes.filter((node) => !isRestrictedLabel(node.id) && !isRestrictedLabel(node.label)).map((node) => node.id),
  );
  const safeNodes = nodes.filter((node) => allowedNodeIds.has(node.id));
  const safeEdges = edges.filter((edge) => allowedNodeIds.has(edge.from) && allowedNodeIds.has(edge.to));
  return { nodes: safeNodes, edges: safeEdges };
};

export const buildImpactFlowPaths = (nodes: ConnectionNode[], edges: ConnectionEdge[], limit = 5) => {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const { nodes: safeNodes, edges: safeEdges } = filterPatientSafeGraph(nodes, edges);

  const contextEdges = safeEdges.filter((edge) => {
    const fromType = nodeById.get(edge.from)?.type;
    const toType = nodeById.get(edge.to)?.type;
    return fromType === "context" && toType === "symptom";
  });

  const impactEdges = safeEdges.filter((edge) => {
    const fromType = nodeById.get(edge.from)?.type;
    const toType = nodeById.get(edge.to)?.type;
    return fromType === "symptom" && toType === "impact";
  });

  const paths: Array<{ context: string; symptom: string; impact: string; score: number }> = [];

  contextEdges.forEach((contextEdge) => {
    impactEdges
      .filter((impactEdge) => impactEdge.from === contextEdge.to)
      .forEach((impactEdge) => {
        paths.push({
          context: contextEdge.from,
          symptom: contextEdge.to,
          impact: impactEdge.to,
          score: contextEdge.weight + impactEdge.weight,
        });
      });
  });

  const ranked = paths.sort((a, b) => b.score - a.score).slice(0, limit);
  const selectedNodeIds = new Set<string>();
  const selectedEdges = new Map<string, ConnectionEdge>();

  ranked.forEach((path) => {
    selectedNodeIds.add(path.context);
    selectedNodeIds.add(path.symptom);
    selectedNodeIds.add(path.impact);
  });

  safeEdges.forEach((edge) => {
    if (selectedNodeIds.has(edge.from) && selectedNodeIds.has(edge.to)) {
      selectedEdges.set(`${edge.from}__${edge.to}`, edge);
    }
  });

  return {
    nodes: safeNodes.filter((node) => selectedNodeIds.has(node.id)),
    edges: Array.from(selectedEdges.values()),
  };
};

export const buildThemeSeriesData = (series: ThemeSeries[]) => {
  const dataByDate = new Map<string, Record<string, number>>();
  const themes: string[] = [];

  series.forEach((item) => {
    if (!themes.includes(item.theme)) themes.push(item.theme);
    item.points.forEach((point) => {
      if (!dataByDate.has(point.dateISO)) {
        dataByDate.set(point.dateISO, { dateISO: point.dateISO });
      }
      dataByDate.get(point.dateISO)![item.theme] = point.intensity;
    });
  });

  const data = Array.from(dataByDate.values()).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return { data, themes };
};

export const buildImpactDomainCounts = (signals: EntrySignal[]) => {
  const counts = new Map<string, number>();
  signals.forEach((signal) => {
    signal.evidenceUnits.forEach((unit) => {
      const code = normalizeCode(unit.label);
      if (!code.startsWith("IMPACT_")) return;
      if (restrictedCodes.has(code)) return;
      counts.set(code, (counts.get(code) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code, value]) => ({ code, value }));
};

const addImpactFromTags = (values: string[], impacts: Set<string>) => {
  values.forEach((value) => {
    const lower = String(value || "").toLowerCase();
    if (!lower) return;
    Object.entries(impactKeywordMap).forEach(([keyword, mapped]) => {
      if (lower.includes(keyword)) impacts.add(mapped);
    });
  });
};

export const buildImpactDomainCountsFromEntries = (entries: JournalEntry[] = []) => {
  const counts = new Map<string, number>();

  (entries || []).forEach((entry) => {
    const impacts = new Set<string>();
    (entry.evidenceUnits || []).forEach((unit) => {
      const code = normalizeCode(unit.label);
      if (!code.startsWith("IMPACT_")) return;
      if (restrictedCodes.has(code)) return;
      impacts.add(code);
    });
    const hasNegativeEmotion = (entry.emotions || []).some((emotion) => emotion.tone === "negative");
    if (hasNegativeEmotion) {
      addImpactFromTags([...(entry.themes || []), ...(entry.tags || [])], impacts);
    }
    impacts.forEach((impact) => {
      const weight = hasNegativeEmotion ? 0.5 : 1;
      counts.set(impact, (counts.get(impact) || 0) + weight);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code, value]) => ({ code, value }));
};

export const buildStreamData = (
  series: ThemeSeries[] = [],
  labelMapper: (value: string) => string,
  rangeKey?: string,
) => {
  const rangeDaysMap: Record<string, number> = {
    last_7_days: 7,
    last_30_days: 30,
    last_90_days: 90,
    last_365_days: 365,
  };
  const normalizedRangeKey = rangeKey?.toLowerCase();
  const rangeDays = normalizedRangeKey ? rangeDaysMap[normalizedRangeKey] : undefined;
  const rangeEnd = rangeDays ? new Date() : null;
  const rangeStart = rangeDays && rangeEnd
    ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate() - (rangeDays - 1))
    : null;
  const startISO = rangeStart ? rangeStart.toISOString().slice(0, 10) : null;
  const endISO = rangeEnd ? rangeEnd.toISOString().slice(0, 10) : null;

  const isInRange = (dateISO?: string) => {
    if (!startISO || !endISO) return true;
    if (!dateISO) return false;
    const trimmed = dateISO.slice(0, 10);
    return trimmed >= startISO && trimmed <= endISO;
  };

  const dataMap = new Map<string, Record<string, number>>();
  const keys = new Set<string>();

  series.forEach((item) => {
    const key = labelMapper(item.theme);
    keys.add(key);
    item.points.forEach((point) => {
      const dateISO = point.dateISO;
      if (!isInRange(dateISO)) return;
      if (!dataMap.has(dateISO)) dataMap.set(dateISO, { dateISO });
      const record = dataMap.get(dateISO)!;
      record[key] = (record[key] || 0) + (point.intensity || 0);
    });
  });

  const data = Array.from(dataMap.values()).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return { data, keys: Array.from(keys) };
};

export const buildImpactFlowFromSignals = (signals: EntrySignal[]) => {
  const nodes = new Map<string, ConnectionNode>();
  const edgeCounts = new Map<string, number>();

  const registerNode = (code: string, type: ConnectionNode["type"]) => {
    if (!code || isRestrictedLabel(code)) return;
    if (!nodes.has(code)) {
      nodes.set(code, { id: code, label: getPatientLabel(code), type });
    }
  };

  signals.forEach((signal) => {
    const contexts = new Set<string>();
    const symptoms = new Set<string>();
    const impacts = new Set<string>();

    signal.evidenceUnits.forEach((unit) => {
      const code = normalizeCode(unit.label);
      if (isRestrictedLabel(code)) return;
      if (code.startsWith("CONTEXT_")) contexts.add(code);
      if (code.startsWith("SYMPTOM_")) symptoms.add(code);
      if (code.startsWith("IMPACT_")) impacts.add(code);
    });

    contexts.forEach((context) => registerNode(context, "context"));
    symptoms.forEach((symptom) => registerNode(symptom, "symptom"));
    impacts.forEach((impact) => registerNode(impact, "impact"));

    contexts.forEach((context) => {
      symptoms.forEach((symptom) => {
        const key = `${context}__${symptom}`;
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
      });
    });

    symptoms.forEach((symptom) => {
      impacts.forEach((impact) => {
        const key = `${symptom}__${impact}`;
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
      });
    });
  });

  const edges = Array.from(edgeCounts.entries()).map(([key, weight]) => {
    const [from, to] = key.split("__");
    return { from, to, weight };
  });

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
};

export const buildImpactFlowFromEntries = (entries: JournalEntry[]) => {
  const nodes = new Map<string, ConnectionNode>();
  const edgeCounts = new Map<string, number>();

  const registerNode = (id: string, type: ConnectionNode["type"]) => {
    if (!id || isRestrictedLabel(id)) return;
    if (!nodes.has(id)) {
      nodes.set(id, { id, label: id, type });
    }
  };

  entries.forEach((entry) => {
    const contexts = new Set<string>();
    const symptoms = new Set<string>();
    const impacts = new Set<string>();

    (entry.triggers || []).forEach((trigger) => {
      const label = String(trigger || "").trim();
      if (!label) return;
      registerNode(label, "context");
      contexts.add(label);
    });

    (entry.emotions || []).forEach((emotion) => {
      const label = String(emotion.label || "").trim();
      if (!label) return;
      registerNode(label, "symptom");
      symptoms.add(label);
    });

    (entry.evidenceUnits || []).forEach((unit) => {
      if (unit.attributes?.polarity === "ABSENT") return;
      const code = normalizeCode(unit.label);
      if (restrictedCodes.has(code)) return;
      if (code.startsWith("CONTEXT_")) {
        registerNode(code, "context");
        contexts.add(code);
      } else if (code.startsWith("SYMPTOM_")) {
        registerNode(code, "symptom");
        symptoms.add(code);
      } else if (code.startsWith("IMPACT_")) {
        registerNode(code, "impact");
        impacts.add(code);
      }
    });

    addImpactFromTags([...(entry.themes || []), ...(entry.tags || [])], impacts);
    impacts.forEach((impact) => registerNode(impact, "impact"));

    contexts.forEach((context) => {
      symptoms.forEach((symptom) => {
        const key = `${context}__${symptom}`;
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
      });
    });

    symptoms.forEach((symptom) => {
      impacts.forEach((impact) => {
        const key = `${symptom}__${impact}`;
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
      });
    });
  });

  const edges = Array.from(edgeCounts.entries()).map(([key, weight]) => {
    const [from, to] = key.split("__");
    return { from, to, weight };
  });

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
};
