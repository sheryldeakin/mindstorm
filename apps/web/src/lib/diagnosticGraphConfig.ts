export type GraphNodeConfig = {
  id: string;
  label: string;
  kind: "diagnosis" | "symptom" | "gate" | "exclusion";
  evidenceLabels?: string[];
};

export const DIAGNOSTIC_GRAPH_NODES: GraphNodeConfig[] = [
  { id: "mdd-root", label: "MDD criteria alignment", kind: "diagnosis" },
  { id: "mood", label: "Low mood signal", kind: "symptom", evidenceLabels: ["SYMPTOM_MOOD"] },
  { id: "anhedonia", label: "Reduced interest signal", kind: "symptom", evidenceLabels: ["SYMPTOM_MOOD"] },
  { id: "sleep", label: "Sleep change signal", kind: "symptom", evidenceLabels: ["SYMPTOM_SLEEP"] },
  { id: "fatigue", label: "Energy shift signal", kind: "symptom", evidenceLabels: ["SYMPTOM_SOMATIC"] },
  { id: "risk", label: "Risk thoughts signal", kind: "symptom", evidenceLabels: ["SYMPTOM_RISK"] },
  { id: "duration", label: "Duration signal ≥ 2 weeks", kind: "gate" },
  { id: "impairment", label: "Impact gate", kind: "gate", evidenceLabels: ["IMPAIRMENT"] },
  { id: "mania", label: "Mania gate", kind: "exclusion", evidenceLabels: ["SYMPTOM_MANIA"] },
  { id: "substance", label: "Context factor: substance/med", kind: "exclusion", evidenceLabels: ["CONTEXT_SUBSTANCE"] },
  { id: "medical", label: "Context factor: medical", kind: "exclusion", evidenceLabels: ["CONTEXT_MEDICAL"] },
];
