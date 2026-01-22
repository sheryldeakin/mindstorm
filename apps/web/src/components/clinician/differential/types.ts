export type DiagnosisKey = "mdd" | "pdd" | "pmdd" | "dmdd" | "smidd" | "ddamc" | "osdd" | "udd";

export type DiagnosisCard = {
  key: DiagnosisKey;
  title: string;
  abbreviation: string;
  likelihood: "High" | "Moderate" | "Low";
  status: "Sufficient" | "Incomplete" | "Insufficient";
  shortSummary: string;
  blocked?: boolean;
  blockedReason?: string;
  trend?: "up" | "down" | "steady";
  rankingReason?: string;
  criteriaPreview?: {
    met: number;
    total: number;
  };
  cycleAlignment?: {
    state: "met" | "mismatch" | "unknown";
    note?: string;
  };
};

export type CriterionItem = {
  id: string;
  label: string;
  state: "present" | "absent" | "ambiguous";
  evidenceNote: string;
  evidenceLabels?: string[];
  severity?: "mild" | "moderate" | "high";
  recency?: string;
};

export type SymptomCourseRow = {
  id: string;
  label: string;
  evidenceLabels: string[];
  autoStatus?: "MET" | "EXCLUDED" | "UNKNOWN";
  overrideStatus?: "MET" | "EXCLUDED" | "UNKNOWN" | null;
  buckets: Array<{ weekStartISO: string; level: "none" | "mild" | "moderate" | "high" }>;
};

export type FunctionalImpactDomain = {
  id: string;
  domain: "Work/School" | "Social" | "Self-care" | "Safety";
  level: "none" | "mild" | "moderate" | "high";
  note?: string;
  evidenceLabels?: string[];
  autoStatus?: "MET" | "EXCLUDED" | "UNKNOWN";
  overrideStatus?: "MET" | "EXCLUDED" | "UNKNOWN" | null;
};

export type ExclusionCheck = {
  id: string;
  label: string;
  state: "confirmed" | "notObserved" | "unknown";
  note?: string;
  evidenceLabels?: string[];
  autoStatus?: "MET" | "EXCLUDED" | "UNKNOWN";
  overrideStatus?: "MET" | "EXCLUDED" | "UNKNOWN" | null;
};

export type ClarificationPrompt = {
  text: string;
  category?: "criteria" | "duration" | "impact" | "medical" | "substance";
};

export type SpecifierTag = {
  label: string;
  startISO: string;
  endISO: string;
  active: boolean;
  evidenceCount?: number;
  density?: "Sparse" | "Moderate" | "Dense";
  timelinePoints?: number[];
  spanDays?: number;
};

export type DifferentialDiagnosis = {
  key: DiagnosisKey;
  card: DiagnosisCard;
  criteria: CriterionItem[];
  criteriaSummary: {
    current: number;
    required: number;
    total: number;
    base?: number;
    added?: number;
    subtracted?: number;
    window?: {
      label: string;
      current: number;
      total: number;
      required: number;
      note?: string;
    };
  };
  criteriaSets?: {
    current: { label: string; items: CriterionItem[]; summary: DifferentialDiagnosis["criteriaSummary"] };
    diagnostic?: { label: string; items: CriterionItem[]; summary: DifferentialDiagnosis["criteriaSummary"] };
    lifetime: { label: string; items: CriterionItem[]; summary: DifferentialDiagnosis["criteriaSummary"] };
  };
  symptomCourse: SymptomCourseRow[];
  functionalImpact: FunctionalImpactDomain[];
  exclusionChecks: ExclusionCheck[];
  prompts: ClarificationPrompt[];
  specifiers: SpecifierTag[];
};
