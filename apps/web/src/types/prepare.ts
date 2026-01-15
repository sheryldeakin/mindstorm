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
