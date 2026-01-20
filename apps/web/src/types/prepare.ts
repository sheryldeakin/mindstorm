export interface SummaryQuote {
  id: string;
  text: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  timestamp: string;
}

export interface PrepareSummary {
  timeRangeLabel: string;
  confidenceNote: string;
  whySharing: string;
  recurringExperiences: string[];
  overTimeSummary: string;
  intensityLines: string[];
  impactAreas: string[];
  impactNote: string;
  relatedInfluences: string[];
  unclearAreas: string[];
  questionsToExplore: string[];
  evidenceBySection: {
    recurringExperiences?: { bullet: string; quotes: string[] }[];
    impactAreas?: { bullet: string; quotes: string[] }[];
    relatedInfluences?: { bullet: string; quotes: string[] }[];
    unclearAreas?: { bullet: string; quotes: string[] }[];
    questionsToExplore?: { bullet: string; quotes: string[] }[];
  };
  topics: string[];
}

export interface ClinicianAppendix {
  coverage: Array<{
    label: string;
    current: number;
    lifetime: number;
    max: number;
    threshold?: number;
  }>;
  signalDensity: number;
  missingGates?: {
    duration?: boolean;
    impairment?: boolean;
    missing?: string[];
  };
  highConfidenceEvidence: Array<{
    dateISO: string;
    label: string;
    span: string;
    attributes?: {
      polarity?: string | null;
      temporality?: string | null;
      frequency?: string | null;
      severity?: string | null;
      attribution?: string | null;
      uncertainty?: string | null;
    };
  }>;
  highUncertaintyEvidence?: Array<{
    date: string;
    label: string;
    quote: string;
  }>;
}

export interface WeeklySummary {
  weekStartISO: string;
  weekEndISO: string;
  summary: {
    recurringExperiences: string[];
    overTimeSummary: string;
    intensityLines: string[];
    impactAreas: string[];
    relatedInfluences: string[];
    unclearAreas: string[];
    questionsToExplore: string[];
  } | null;
}
