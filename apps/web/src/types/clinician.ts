export type RiskSignal = {
  detected: boolean;
  type: "active_suicidality" | "passive_suicidality" | string;
  level: "high" | "moderate" | string;
  confidence?: number | null;
  source?: string | null;
};

export type EvidenceUnit = {
  span: string;
  label: string;
  attributes?: {
    polarity?: "PRESENT" | "ABSENT" | null;
    temporality?: string | null;
    frequency?: string | null;
    severity?: string | null;
    attribution?: string | null;
    confidence?: "HIGH" | "LOW" | string | null;
    type?: "computed" | "extracted" | null;
    uncertainty?: "LOW" | "HIGH" | null;
  };
};

export interface JournalEntry {
  dateISO: string;
  summary: string;
  symptoms: string[];
  denials: string[];
  context_tags: string[];
  risk_signal?: RiskSignal | null;
}

export interface CriteriaNodeStatus {
  id: string;
  status: "MET" | "UNMET" | "UNKNOWN" | "EXCLUDED";
  evidence: JournalEntry[];
  lastDetected: string;
}

export type ClinicianOverride = {
  nodeId: string;
  status: "MET" | "EXCLUDED" | "UNKNOWN";
  note?: string | null;
};

export type ClinicianOverrideRecord = {
  id: string;
  nodeId: string;
  status: "MET" | "EXCLUDED" | "UNKNOWN";
  originalStatus: "MET" | "EXCLUDED" | "UNKNOWN";
  originalEvidence?: string;
  note?: string | null;
  updatedAt?: string;
};

export type ClinicianNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ClinicianCase = {
  userId: string;
  name: string;
  email: string;
  totalEntries: number;
  entriesLast30Days: number;
  entriesLast30DaysSeries?: number[];
  lastEntryDate: string;
  lastRiskSignal: RiskSignal | null;
};

export type CaseEntry = {
  id: string;
  dateISO: string;
  summary: string;
  risk_signal: RiskSignal | null;
  evidenceUnits: EvidenceUnit[];
  symptoms?: string[];
  denials?: string[];
  context_tags?: string[];
};
