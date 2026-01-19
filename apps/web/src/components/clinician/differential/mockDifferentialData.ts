import type { DifferentialDiagnosis } from "./types";

export const mockDifferentialData: DifferentialDiagnosis[] = [
  {
    key: "mdd",
    card: {
      key: "mdd",
      title: "Major Depressive Disorder",
      abbreviation: "MDD",
      likelihood: "High",
      status: "Sufficient",
      shortSummary: "Mood, sleep, and energy signals align with core criteria.",
    },
    criteria: [
      {
        id: "mdd-a1",
        label: "Low mood signal",
        state: "present",
        evidenceNote: "Low mood noted on 8 of last 14 entries.",
        severity: "high",
        recency: "2025-09-18",
      },
      {
        id: "mdd-a2",
        label: "Reduced interest signal",
        state: "present",
        evidenceNote: "Loss of interest noted during social activities.",
        severity: "moderate",
        recency: "2025-09-17",
      },
      {
        id: "mdd-a4",
        label: "Sleep change signal",
        state: "present",
        evidenceNote: "Insomnia reported 5 nights this week.",
        severity: "moderate",
        recency: "2025-09-19",
      },
      {
        id: "mdd-a6",
        label: "Energy shift signal",
        state: "present",
        evidenceNote: "Fatigue noted after short tasks.",
        severity: "high",
        recency: "2025-09-16",
      },
      {
        id: "mdd-a7",
        label: "Worthlessness/guilt signal",
        state: "ambiguous",
        evidenceNote: "Self-criticism present but causal link unclear.",
        severity: "mild",
        recency: "2025-09-15",
      },
    ],
    criteriaSummary: { current: 5, required: 5, total: 9 },
    symptomCourse: [
      {
        label: "Low mood",
        buckets: [
          { weekStartISO: "2025-08-18", level: "high" },
          { weekStartISO: "2025-08-25", level: "high" },
          { weekStartISO: "2025-09-01", level: "moderate" },
          { weekStartISO: "2025-09-08", level: "moderate" },
          { weekStartISO: "2025-09-15", level: "high" },
        ],
      },
      {
        label: "Sleep",
        buckets: [
          { weekStartISO: "2025-08-18", level: "moderate" },
          { weekStartISO: "2025-08-25", level: "moderate" },
          { weekStartISO: "2025-09-01", level: "moderate" },
          { weekStartISO: "2025-09-08", level: "mild" },
          { weekStartISO: "2025-09-15", level: "moderate" },
        ],
      },
      {
        label: "Anxiety",
        buckets: [
          { weekStartISO: "2025-08-18", level: "mild" },
          { weekStartISO: "2025-08-25", level: "mild" },
          { weekStartISO: "2025-09-01", level: "moderate" },
          { weekStartISO: "2025-09-08", level: "moderate" },
          { weekStartISO: "2025-09-15", level: "moderate" },
        ],
      },
    ],
    functionalImpact: [
      { domain: "Work/School", level: "moderate", note: "Missed deadlines, slowed output." },
      { domain: "Social", level: "moderate", note: "Declined plans 3 times." },
      { domain: "Self-care", level: "mild", note: "Hygiene lapses noted twice." },
      { domain: "Safety", level: "none", note: "No safety incidents noted." },
    ],
    exclusionChecks: [
      { label: "Mania history", state: "notObserved", note: "No mania signals in journal." },
      { label: "Substance/medication attribution", state: "unknown", note: "Medication change mentioned once." },
      { label: "Medical condition attribution", state: "unknown", note: "No recent lab data." },
    ],
    prompts: [
      { text: "Confirm symptom duration exceeds 2 weeks.", category: "duration" },
      { text: "Screen for any past manic episodes.", category: "criteria" },
      { text: "Clarify any recent medical changes or lab abnormalities.", category: "medical" },
    ],
    specifiers: [
      { label: "Anxious distress", startISO: "2025-09-01", endISO: "2025-09-19", active: true },
      { label: "Melancholic features", startISO: "2025-08-18", endISO: "2025-09-01", active: false },
    ],
  },
  {
    key: "gad",
    card: {
      key: "gad",
      title: "Generalized Anxiety",
      abbreviation: "GAD",
      likelihood: "Moderate",
      status: "Incomplete",
      shortSummary: "Worry signals present but duration unclear.",
    },
    criteria: [
      {
        id: "gad-a1",
        label: "Excessive worry signal",
        state: "present",
        evidenceNote: "Worry noted on 6 entries.",
        severity: "moderate",
        recency: "2025-09-18",
      },
      {
        id: "gad-a2",
        label: "Restlessness signal",
        state: "ambiguous",
        evidenceNote: "Restlessness implied, not explicit.",
        severity: "mild",
        recency: "2025-09-12",
      },
      {
        id: "gad-a3",
        label: "Muscle tension signal",
        state: "absent",
        evidenceNote: "No tension noted.",
      },
    ],
    criteriaSummary: { current: 3, required: 6, total: 6 },
    symptomCourse: [
      {
        label: "Worry",
        buckets: [
          { weekStartISO: "2025-08-18", level: "mild" },
          { weekStartISO: "2025-08-25", level: "moderate" },
          { weekStartISO: "2025-09-01", level: "moderate" },
          { weekStartISO: "2025-09-08", level: "moderate" },
          { weekStartISO: "2025-09-15", level: "moderate" },
        ],
      },
    ],
    functionalImpact: [
      { domain: "Work/School", level: "mild", note: "Focus disrupted during meetings." },
      { domain: "Social", level: "mild", note: "Avoided two conversations." },
      { domain: "Self-care", level: "none", note: "No self-care impact noted." },
      { domain: "Safety", level: "none", note: "No safety concerns noted." },
    ],
    exclusionChecks: [
      { label: "Substance/medication attribution", state: "notObserved", note: "No substance context." },
      { label: "Medical condition attribution", state: "unknown", note: "Ask about thyroid or pain." },
    ],
    prompts: [
      { text: "Clarify worry duration (≥ 6 months).", category: "duration" },
      { text: "Ask about muscle tension or irritability.", category: "criteria" },
    ],
    specifiers: [{ label: "Anxious distress", startISO: "2025-09-01", endISO: "2025-09-19", active: true }],
  },
  {
    key: "ptsd",
    card: {
      key: "ptsd",
      title: "Trauma-related pattern",
      abbreviation: "PTSD",
      likelihood: "Low",
      status: "Insufficient",
      shortSummary: "Trauma signals are sparse and inconsistent.",
    },
    criteria: [
      {
        id: "ptsd-a1",
        label: "Trauma exposure signal",
        state: "ambiguous",
        evidenceNote: "One indirect mention of traumatic memory.",
        severity: "mild",
        recency: "2025-09-06",
      },
      {
        id: "ptsd-a2",
        label: "Intrusions signal",
        state: "absent",
        evidenceNote: "No clear flashback reports.",
      },
    ],
    criteriaSummary: { current: 1, required: 4, total: 7 },
    symptomCourse: [
      {
        label: "Intrusions",
        buckets: [
          { weekStartISO: "2025-08-18", level: "none" },
          { weekStartISO: "2025-08-25", level: "none" },
          { weekStartISO: "2025-09-01", level: "mild" },
          { weekStartISO: "2025-09-08", level: "none" },
          { weekStartISO: "2025-09-15", level: "none" },
        ],
      },
    ],
    functionalImpact: [
      { domain: "Work/School", level: "none" },
      { domain: "Social", level: "none" },
      { domain: "Self-care", level: "none" },
      { domain: "Safety", level: "none" },
    ],
    exclusionChecks: [
      { label: "Trauma exposure confirmation", state: "unknown", note: "Needs direct screening." },
    ],
    prompts: [{ text: "Clarify trauma exposure timeline.", category: "criteria" }],
    specifiers: [],
  },
];
