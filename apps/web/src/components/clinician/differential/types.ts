export type DiagnosisKey = "mdd" | "pdd" | "pmdd" | "dmdd" | "smidd" | "ddamc" | "osdd" | "udd";

export type DiagnosisCard = {
  key: DiagnosisKey;
  title: string;
  abbreviation: string;
  likelihood: "High" | "Moderate" | "Low";
  status: "Sufficient" | "Incomplete" | "Insufficient";
  shortSummary: string;
  criteriaPreview?: {
    met: number;
    total: number;
  };
};

export type CriterionItem = {
  id: string;
  label: string;
  state: "present" | "absent" | "ambiguous";
  evidenceNote: string;
  severity?: "mild" | "moderate" | "high";
  recency?: string;
};

export type SymptomCourseRow = {
  label: string;
  buckets: Array<{ weekStartISO: string; level: "none" | "mild" | "moderate" | "high" }>;
};

export type FunctionalImpactDomain = {
  domain: "Work/School" | "Social" | "Self-care" | "Safety";
  level: "none" | "mild" | "moderate" | "high";
  note?: string;
};

export type ExclusionCheck = {
  label: string;
  state: "confirmed" | "notObserved" | "unknown";
  note?: string;
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
  symptomCourse: SymptomCourseRow[];
  functionalImpact: FunctionalImpactDomain[];
  exclusionChecks: ExclusionCheck[];
  prompts: ClarificationPrompt[];
  specifiers: SpecifierTag[];
};
