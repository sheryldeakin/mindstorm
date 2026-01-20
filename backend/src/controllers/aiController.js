const asyncHandler = require("../utils/asyncHandler");

const buildPrompt = () =>
  [
    "You are a therapist assistant that extracts structured data from a journal entry.",
    "Return strict JSON with keys: title (short 3-6 word title), emotions (array of {label, intensity 0-100, tone: positive|neutral|negative}), themes (array of short themes, 1-3 words), themeIntensities (array of {theme, intensity 0-1}), triggers (array of short phrases), summary (1-2 sentences).",
    "Keep it concise and avoid long text. Use lower-case for themes/triggers. Title should be in title case.",
  ].join(" ");

const buildPreparePrompt = (timeRangeLabel) =>
  [
    "You are generating a patient-authored reflection summary for a clinician.",
    "Use plain language, no medical or diagnostic terms, no DSM labels, no severity scales, no causality claims.",
    "Tone: first-person, experience-first, respectful, concise. Use 'I' statements and patient voice.",
    "The whySharing field must be first-person (start with 'I') and should sound like the patient speaking.",
    "Focus on patterns, questions, and lived impact.",
    "For impactAreas, prefer these patient-friendly domains when relevant: Work/School, Relationships, Energy and Self-care, Motivation, Feeling safe or steady, Enjoyment and meaning.",
    "For relatedInfluences, focus on contextual factors (sleep, stress, medication changes, substances, physical health, major events) rather than life domains.",
    "Return strict JSON with keys:",
    "timeRangeLabel (string), confidenceNote (string), whySharing (string), recurringExperiences (array of strings),",
    "overTimeSummary (string), intensityLines (array of 3 short strings like 'Jan ..'), impactAreas (array of strings),",
    "impactNote (string), relatedInfluences (array of strings), unclearAreas (array of strings),",
    "questionsToExplore (array of strings).",
    `Time range label: ${timeRangeLabel}.`,
  ].join(" ");

const buildPrepareChunkPrompt = (timeRangeLabel) =>
  [
    "You are generating a short patient-authored summary for a subset of journal entries.",
    "Use plain language, no medical or diagnostic terms, no DSM labels, no severity scales, no causality claims.",
    "Tone: first-person, experience-first, respectful, concise. Use 'I' statements and patient voice.",
    "For impactAreas, prefer these patient-friendly domains when relevant: Work/School, Relationships, Energy and Self-care, Motivation, Feeling safe or steady, Enjoyment and meaning.",
    "For relatedInfluences, focus on contextual factors (sleep, stress, medication changes, substances, physical health, major events) rather than life domains.",
    "Return strict JSON with keys:",
    "recurringExperiences (array of strings), overTimeSummary (string), intensityLines (array of 2 short strings like 'Week 1 ..'),",
    "impactAreas (array of strings), relatedInfluences (array of strings), unclearAreas (array of strings),",
    "questionsToExplore (array of strings).",
    `Time range label: ${timeRangeLabel}.`,
  ].join(" ");

const buildPrepareMergePrompt = (timeRangeLabel) =>
  [
    "You are merging multiple chunk summaries into one patient-authored reflection summary for a clinician.",
    "Use plain language, no medical or diagnostic terms, no DSM labels, no severity scales, no causality claims.",
    "Tone: first-person, experience-first, respectful, concise. Use 'I' statements and patient voice.",
    "The whySharing field must be first-person (start with 'I') and should sound like the patient speaking.",
    "Focus on patterns, questions, and lived impact.",
    "For impactAreas, prefer these patient-friendly domains when relevant: Work/School, Relationships, Energy and Self-care, Motivation, Feeling safe or steady, Enjoyment and meaning.",
    "For relatedInfluences, focus on contextual factors (sleep, stress, medication changes, substances, physical health, major events) rather than life domains.",
    "Return strict JSON with keys:",
    "timeRangeLabel (string), confidenceNote (string), whySharing (string), recurringExperiences (array of strings),",
    "overTimeSummary (string), intensityLines (array of 3 short strings like 'Jan ..'), impactAreas (array of strings),",
    "impactNote (string), relatedInfluences (array of strings), unclearAreas (array of strings),",
    "questionsToExplore (array of strings).",
    `Time range label: ${timeRangeLabel}.`,
  ].join(" ");

const buildEntryEvidencePrompt = () =>
  [
    "You are extracting short evidence snippets from a single journal entry.",
    "Use exact phrases from the entry. No diagnosis terms. No interpretations.",
    "Return strict JSON with keys:",
    "recurringExperiences (array of short quotes), impactAreas (array of short quotes), relatedInfluences (array of short quotes),",
    "unclearAreas (array of short quotes), questionsToExplore (array of short quotes).",
  ].join(" ");

const buildClinicalSignalPrompt = () =>
  [
    "System Prompt: Clinical Signal Extraction Engine",
    "Role: You are a clinical NLP extraction engine. Your purpose is to analyze patient narratives and extract Evidence Units,",
    "structured clinical signals consisting of text spans and semantic attributes. You must act as a neutral extractor,",
    "not a diagnostician. Do not infer diagnoses; only identify the presence or absence of specific clinical phenomena",
    "described in the text.",
    "Input: A patient narrative (journal entry, interview transcript, or intake form). Output: A JSON array of Evidence Unit objects.",
    
    "Extraction Rules",
    
    "Task A: Span Extraction (The What)",
    "Identify and extract text spans corresponding to these specific categories. Use these EXACT label codes:",
    "provided below to ensure the downstream logic graph can process them.",
    
    "1. Depressive and Anxiety Symptoms",
    "- SYMPTOM_MOOD: Sadness, emptiness, irritability, tearfulness. *CRITICAL: 'Feeling empty' or 'numb' counts as PRESENT mood pathology.*",
    "- SYMPTOM_ANHEDONIA: Loss of interest, 'don't care anymore', 'nothing is fun'.", 
    "- SYMPTOM_COGNITIVE: Diminished concentration, indecisiveness, excessive guilt, feelings of worthlessness, brain fog",
    "- SYMPTOM_SOMATIC: Weight changes, appetite changes, fatigue, low energy, psychomotor agitation",
    "(restlessness) or retardation (slowing down).",
    "- SYMPTOM_SLEEP: Insomnia (can't sleep) or Hypersomnia (sleeping too much).",
    "- SYMPTOM_RISK: Thoughts of death, suicidal ideation, specific plans, or attempts, self-harm. *Critical Safety Signal.*",
    "- SYMPTOM_ANXIETY: Feeling keyed up/tense, worry, tension, panic, fear something awful may happen.",

    "2. Differential & Rule-Out Signals (Distinguish Diagnosis):",
    "- SYMPTOM_MANIA: Elevated/expansive mood, inflated self-esteem/grandiosity, decreased need for sleep, racing thoughts/flight",
    "of ideas, pressured speech, increased goal-directed activity, risk-taking behavior.",
    "- SYMPTOM_PSYCHOSIS: Hallucinations (auditory/visual), delusions, paranoia, disorganized speech or thought.",
    "- SYMPTOM_TRAUMA: Flashbacks, intrusive memories of traumatic events, dissociation, derealization, depersonalization.",

    "3. Functional Impact (Gate Criteria):",
    "*Split general impairment into these specific domains:*",
    "- IMPACT_WORK: Missed work, poor performance, failing classes.",
    "- IMPACT_SOCIAL: Ignoring texts, cancelling plans, isolation, conflict.",
    "- IMPACT_SELF_CARE: Hygiene (shower/teeth), skipping meals, messy environment.",

    "4. Context Factors:", 
    "- CONTEXT_SUBSTANCE: Use of alcohol, drugs, or medications (prescribed or recreational).",
    "- CONTEXT_MEDICAL: Mentions of physical health conditions (e.g., thyroid, pain, pregnancy).",
    "- CONTEXT_STRESSOR: Grief, job loss, breakup/relationship conflict, specific life events.",  
    
    "Task B: Attribute Extraction (The How)",
    
    "For every extracted span, determine the following attributes. If an attribute is not explicitly stated, mark it as null.",
    "1. polarity: 'PRESENT' or 'ABSENT'.",
    "   - CRITICAL: 'I feel empty', 'I feel nothing', or 'I have no energy' = PRESENT.",
    "   - ONLY use ABSENT if the user explicitly denies a symptom (e.g., 'I am NOT sad', 'Sleep was fine', 'No dark thoughts').",
    "2. temporality: onset or duration (e.g., for the last 2 weeks, since childhood).",
    "3. frequency: How often it happens (e.g., 'every night', 'sometimes').",
    "4. severity: Normalize to 'MILD', 'MODERATE', or 'SEVERE' where possible. If ambiguous, use the exact descriptor.",
    "   - For SYMPTOM_RISK: Explicitly distinguish 'Passive' (thoughts) vs 'Active' (intent/plan).",
    "5. attribution: If the user links the symptom to a cause (e.g., 'because of my meds').",
    "6. uncertainty: 'LOW' for direct statements. 'HIGH' for hedging language (e.g., maybe, I think, it is hard to say).",
    
    "--- FEW-SHOT EXAMPLE ---",
    "Input: 'I feel a heavy emptiness that has lasted for two weeks. I can't sleep more than 3 hours, probably because of my new meds. I haven't gone to work since Tuesday. No thoughts of harming myself.'",
    "Output JSON:",
    '{',
    ' "evidence_units": [',
    '   { "span": "heavy emptiness", "label": "SYMPTOM_MOOD", "attributes": { "polarity": "PRESENT", "temporality": "two weeks", "severity": "SEVERE" } },',
    '   { "span": "can\'t sleep more than 3 hours", "label": "SYMPTOM_SLEEP", "attributes": { "polarity": "PRESENT", "frequency": "nightly", "attribution": "new meds" } },',
    '   { "span": "haven\'t gone to work", "label": "IMPACT_WORK", "attributes": { "polarity": "PRESENT", "temporality": "since Tuesday" } },',
    '   { "span": "No thoughts of harming myself", "label": "SYMPTOM_RISK", "attributes": { "polarity": "ABSENT", "severity": "PASSIVE" } }',
    ' ]',
    '}',
    "------------------------",
    
    "JSON Output Schema (Do not include comments in output)",
    "{",
    '  "evidence_units": [',
    "    {",
    '      "span": "substring (exact substring from input)",',
    '      "label": "CATEGORY_CODE (from Task A list)",',
    '      "attributes": {',
    '        "polarity": "PRESENT" | "ABSENT",',
    '        "temporality": "string" | null,',
    '        "frequency": "string" | null,',
    '        "severity": "string" | null,',
    '        "attribution": "string" | null,',
    '        "uncertainty": "LOW" | "HIGH"',
    "      }",
    "    }",
    "  ]",
    "}",
    
    "Constraints: Return at most 8 evidence units. Keep each span under 260 characters.",
    "If nothing is present, return an empty evidence_units array.",
  ].join(" ");

const extractBalancedJson = (text, openChar, closeChar) => {
  const start = text.indexOf(openChar);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
    }

    if (inString) continue;

    if (char === openChar) depth += 1;
    if (char === closeChar) depth -= 1;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
};

const stripTrailingCommas = (text) => text.replace(/,\s*([}\]])/g, "$1");

const sanitizeJsonText = (text) => {
  if (!text) return "";
  let out = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (escapeNext) {
      out += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      out += char;
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      out += char;
      continue;
    }

    if (inString) {
      if (char === "\n") {
        out += "\\n";
        continue;
      }
      if (char === "\r") {
        out += "\\r";
        continue;
      }
      if (char === "\t") {
        out += "\\t";
        continue;
      }
    }

    if (!inString && /[\u0000-\u001f]/.test(char)) {
      continue;
    }

    out += char;
  }

  return out;
};

const extractPartialArrayObjects = (text) => {
  const arrayStart = text.indexOf("[");
  if (arrayStart === -1) return null;

  let inString = false;
  let escapeNext = false;
  let braceDepth = 0;
  let lastObjectEnd = null;

  for (let i = arrayStart; i < text.length; i += 1) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
    }

    if (inString) continue;

    if (char === "{") braceDepth += 1;
    if (char === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) lastObjectEnd = i;
    }
  }

  if (lastObjectEnd === null) return null;

  const arrayBody = text.slice(arrayStart + 1, lastObjectEnd + 1);
  const trimmed = stripTrailingCommas(arrayBody.trim());
  const wrapped = `[${trimmed}]`;
  try {
    return JSON.parse(stripTrailingCommas(sanitizeJsonText(wrapped)));
  } catch {
    return null;
  }
};

const stripCodeFences = (text) =>
  text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

const parseJsonCandidate = (candidate) => {
  if (!candidate) return null;
  try {
    return JSON.parse(stripTrailingCommas(sanitizeJsonText(candidate)));
  } catch {
    return null;
  }
};

const extractFirstLast = (text, openChar, closeChar) => {
  const start = text.indexOf(openChar);
  const end = text.lastIndexOf(closeChar);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
};

const extractJson = (text) => {
  if (!text) return null;
  const cleaned = stripCodeFences(text);

  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    const direct = parseJsonCandidate(cleaned);
    if (direct) return direct;
  }

  const objectSlice = extractBalancedJson(cleaned, "{", "}");
  const objectParsed = parseJsonCandidate(objectSlice);
  if (objectParsed) return objectParsed;

  const arraySlice = extractBalancedJson(cleaned, "[", "]");
  const arrayParsed = parseJsonCandidate(arraySlice);
  if (arrayParsed) return arrayParsed;

  const objectFallback = parseJsonCandidate(extractFirstLast(cleaned, "{", "}"));
  if (objectFallback) return objectFallback;

  const arrayFallback = parseJsonCandidate(extractFirstLast(cleaned, "[", "]"));
  if (arrayFallback) return arrayFallback;

  return null;
};

const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

const getWeekEndIso = (weekStartIso) => {
  const [year, month, day] = weekStartIso.split("-").map((value) => Number(value));
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().slice(0, 10);
};

const shouldUseJsonResponseFormat = (baseUrl) => {
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
  if (process.env.LLM_FORCE_JSON_RESPONSE_FORMAT === "true") return true;
  if (process.env.LLM_DISABLE_JSON_RESPONSE_FORMAT === "true") return false;
  return !isLocal;
};

const callLlm = async ({ baseUrl, apiKey, model, messages, maxTokens }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const responseFormat = shouldUseJsonResponseFormat(baseUrl)
      ? { response_format: { type: "json_object" } }
      : {};
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey || "sk-local"}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens,
        ...responseFormat,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: "LLM request failed.",
        details: { status: response.status, statusText: response.statusText, body: errorText },
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "No response content." };
    }

    const parsed = extractJson(content);
    if (!parsed) {
      const debug = process.env.LLM_DEBUG_PARSE === "true";
      return {
        error: "Failed to parse JSON response.",
        details: debug ? { contentSnippet: content.slice(0, 800) } : undefined,
      };
    }

    return { data: parsed };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { error: "LLM request timed out." };
    }
    return { error: "LLM request failed.", details: { message: err?.message || String(err) } };
  } finally {
    clearTimeout(timeout);
  }
};

const callLlmWithRetry = async (options) => {
  const initial = await callLlm(options);
  if (!initial.error || initial.error !== "Failed to parse JSON response.") {
    return initial;
  }

  const retry = await callLlm({
    ...options,
    messages: [
      ...options.messages,
      { role: "user", content: "Your last response was not valid JSON. Return JSON only." },
    ],
  });
  return retry;
};

const callLlmRaw = async ({ baseUrl, apiKey, model, messages, maxTokens }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const responseFormat = shouldUseJsonResponseFormat(baseUrl)
      ? { response_format: { type: "json_object" } }
      : {};
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey || "sk-local"}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens,
        ...responseFormat,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: "LLM request failed.",
        details: { status: response.status, statusText: response.statusText, body: errorText },
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "No response content." };
    }

    return { content };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { error: "LLM request timed out." };
    }
    return { error: "LLM request failed.", details: { message: err?.message || String(err) } };
  } finally {
    clearTimeout(timeout);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callLlmRawWithRetry = async ({ baseUrl, apiKey, model, messages, maxTokens, retries = 2 }) => {
  let attempt = 0;
  let lastResult = null;
  while (attempt <= retries) {
    lastResult = await callLlmRaw({ baseUrl, apiKey, model, messages, maxTokens });
    if (!lastResult?.error) return lastResult;
    const shouldRetry = lastResult?.error === "LLM request failed." || lastResult?.error === "LLM request timed out.";
    if (!shouldRetry || attempt === retries) return lastResult;
    await delay(500 * (attempt + 1));
    attempt += 1;
  }
  return lastResult;
};

const generateEntryEvidence = async (entryText) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
  }

  const response = await callLlmWithRetry({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: "system", content: buildEntryEvidencePrompt() },
      { role: "user", content: `Journal entry:\n${entryText}\nReturn JSON only.` },
    ],
    maxTokens: 220,
  });

  if (response.error) {
    return { error: response.error, details: response.details };
  }

  return {
    evidenceBySection: {
      recurringExperiences: response.data.recurringExperiences || [],
      impactAreas: response.data.impactAreas || [],
      relatedInfluences: response.data.relatedInfluences || [],
      unclearAreas: response.data.unclearAreas || [],
      questionsToExplore: response.data.questionsToExplore || [],
    },
  };
};

const generateClinicalEvidenceUnits = async (entryText) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
  }

  const buildMessages = (retry) => [
    { role: "system", content: buildClinicalSignalPrompt() },
    {
      role: "user",
      content: [
        `Patient narrative:\n${entryText}`,
        "Return JSON only.",
        retry
          ? "Your last response was not valid JSON. Return an object with key evidence_units only."
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const response = await callLlmRawWithRetry({
    baseUrl,
    apiKey,
    model,
    messages: buildMessages(false),
    maxTokens: 1200,
  });

  if (response.error) {
    return { error: response.error, details: response.details };
  }

  const normalizeJsonText = (content) => {
    if (!content) return "";
    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json/i, "```").replace(/```/g, "");
    return cleaned.trim();
  };

  const parseContent = (content) => {
    const cleaned = normalizeJsonText(content);
    const sanitized = sanitizeJsonText(cleaned);
    const cleanedNoTrailingCommas = stripTrailingCommas(sanitized);

    try {
      return JSON.parse(cleanedNoTrailingCommas);
    } catch {
      const objectSlice = extractBalancedJson(cleanedNoTrailingCommas, "{", "}");
      if (objectSlice) {
        try {
          return JSON.parse(stripTrailingCommas(sanitizeJsonText(objectSlice)));
        } catch {
          return null;
        }
      }

      const arraySlice = extractBalancedJson(cleanedNoTrailingCommas, "[", "]");
      if (arraySlice) {
        try {
          return { evidence_units: JSON.parse(stripTrailingCommas(sanitizeJsonText(arraySlice))) };
        } catch {
          return null;
        }
      }

      const partialArray = extractPartialArrayObjects(cleanedNoTrailingCommas);
      if (partialArray) {
        return { evidence_units: partialArray };
      }
      return null;
    }
  };

  let parsed = parseContent(response.content);
  if (!parsed) {
    const retry = await callLlmRawWithRetry({
      baseUrl,
      apiKey,
      model,
      messages: buildMessages(true),
      maxTokens: 1200,
    });
    if (retry.error) {
      return { error: retry.error, details: retry.details };
    }
    parsed = parseContent(retry.content);
  }

  if (!parsed) {
    const debug = process.env.LLM_DEBUG_PARSE === "true";
    return {
      error: "Failed to parse JSON response.",
      details: debug
        ? { contentSnippet: (response.content || "").slice(0, 800) }
        : undefined,
    };
  }

  const normalizeEvidenceUnits = (units) => {
    if (!Array.isArray(units)) return [];
    return units
      .filter((unit) => unit && typeof unit === "object")
      .map((unit) => ({
        span: typeof unit.span === "string" ? unit.span.trim() : "",
        label: typeof unit.label === "string" ? unit.label.trim() : "",
        attributes: unit.attributes && typeof unit.attributes === "object" ? unit.attributes : {},
      }))
      .filter((unit) => unit.span && unit.label);
  };

  const evidenceUnits = normalizeEvidenceUnits(parsed.evidence_units);
  if (Array.isArray(parsed.evidence_units) && parsed.evidence_units.length && !evidenceUnits.length) {
    return {
      error: "Invalid evidence_units format.",
      details: { sampleTypes: parsed.evidence_units.slice(0, 3).map((unit) => typeof unit) },
    };
  }

  return { evidenceUnits };
};

const generateWeeklySummary = async ({ userId, weekStartIso }) => {
  const normalizedWeekStart = getWeekStartIso(weekStartIso);
  const Entry = require("../models/Entry");
  const WeeklySummary = require("../models/WeeklySummary");
  const weekEndIso = getWeekEndIso(normalizedWeekStart);

  const entries = await Entry.find({
    userId,
    dateISO: { $gte: normalizedWeekStart, $lte: weekEndIso },
    deletedAt: null,
  })
    .sort({ dateISO: 1 })
    .lean();

  if (!entries.length) {
    await WeeklySummary.findOneAndDelete({ userId, weekStartISO: normalizedWeekStart });
    return null;
  }

  const timeRangeLabel = `Week of ${normalizedWeekStart}`;
  const entryText = entries
    .map((entry) => {
      const tags = Array.isArray(entry.tags) ? entry.tags.join(", ") : "";
      const themes = Array.isArray(entry.themes) ? entry.themes.join(", ") : "";
      const triggers = Array.isArray(entry.triggers) ? entry.triggers.join(", ") : "";
      const summary = entry.summary || "";
      return `Date: ${entry.dateISO}. Title: ${entry.title}. Summary: ${summary}. Tags: ${tags}. Themes: ${themes}. Triggers: ${triggers}.`;
    })
    .join("\n");

  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
  }

  const response = await callLlmWithRetry({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: "system", content: buildPrepareChunkPrompt(timeRangeLabel) },
      { role: "user", content: `Journal entries:\n${entryText}\nReturn JSON only.` },
    ],
    maxTokens: 350,
  });

  if (response.error) {
    return { error: response.error };
  }

  const summary = {
    recurringExperiences: response.data.recurringExperiences || [],
    overTimeSummary: response.data.overTimeSummary || "",
    intensityLines: response.data.intensityLines || [],
    impactAreas: response.data.impactAreas || [],
    relatedInfluences: response.data.relatedInfluences || [],
    unclearAreas: response.data.unclearAreas || [],
    questionsToExplore: response.data.questionsToExplore || [],
  };

  await WeeklySummary.findOneAndUpdate(
    { userId, weekStartISO: normalizedWeekStart },
    { weekStartISO: normalizedWeekStart, weekEndISO: weekEndIso, summary },
    { upsert: true, new: true },
  );

  return summary;
};

const analyzeEntry = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: "Text is required." });
  }

  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return res.status(500).json({ message: "OPENAI_API_KEY is not set." });
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey || "sk-local"}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildPrompt() },
        { role: "user", content: `Journal entry:\n${text}\nReturn JSON only.` },
      ],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ message: `LLM request failed: ${errorText}` });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return res.status(502).json({ message: "No analysis returned." });
  }

  const parsed = extractJson(content);
  if (!parsed) {
    return res.status(502).json({ message: "Failed to parse analysis JSON." });
  }

  res.json({
    analysis: {
      title: parsed.title,
      emotions: parsed.emotions || [],
      themes: parsed.themes || [],
      themeIntensities: parsed.themeIntensities || [],
      triggers: parsed.triggers || [],
      summary: parsed.summary,
    },
  });
});

const prepareSummary = asyncHandler(async (req, res) => {
  console.log("[prepare-summary] request", {
    userId: req.user?._id?.toString?.() || "unknown",
    rangeDays: req.body?.rangeDays,
  });
  const rangeDays = Number.parseInt(req.body?.rangeDays, 10) || 56;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (rangeDays - 1));
  const startIso = start.toISOString().slice(0, 10);

  const Entry = require("../models/Entry");
  const entries = await Entry.find({
    userId: req.user._id,
    dateISO: { $gte: startIso },
    deletedAt: null,
  })
    .sort({ dateISO: 1 })
    .lean();

  if (!entries.length) {
    console.log("[prepare-summary] no entries found for range", { startIso, rangeDays });
    return res.json({
      summary: {
        timeRangeLabel: `Last ${rangeDays} days`,
        confidenceNote: "Not enough entries yet to detect patterns.",
        whySharing: "",
        recurringExperiences: [],
        overTimeSummary: "",
        intensityLines: [],
        impactAreas: [],
        impactNote: "",
        relatedInfluences: [],
        unclearAreas: [],
        questionsToExplore: [],
        evidenceBySection: {
          recurringExperiences: [],
          impactAreas: [],
          relatedInfluences: [],
          unclearAreas: [],
          questionsToExplore: [],
        },
        topics: [],
      },
    });
  }

  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    console.warn("[prepare-summary] missing OPENAI_API_KEY and not local", { baseUrl });
    return res.status(500).json({ message: "OPENAI_API_KEY is not set." });
  }

  const timeRangeLabel = rangeDays >= 56 ? "Last 8 weeks" : `Last ${rangeDays} days`;
  const WeeklySummary = require("../models/WeeklySummary");
  const weekKeys = Array.from(new Set(entries.map((entry) => getWeekStartIso(entry.dateISO)))).sort();
  const weeklySummaries = await WeeklySummary.find({
    userId: req.user._id,
    weekStartISO: { $in: weekKeys },
  }).lean();

  const summaryMap = new Map(weeklySummaries.map((item) => [item.weekStartISO, item.summary]));
  const missingKeys = weekKeys.filter((key) => !summaryMap.has(key));

  if (missingKeys.length) {
    console.log("[prepare-summary] backfilling weekly summaries", { missing: missingKeys.length });
    for (let i = 0; i < missingKeys.length; i += 2) {
      const batch = missingKeys.slice(i, i + 2);
      const results = await Promise.all(
        batch.map((weekStartIso) => generateWeeklySummary({ userId: req.user._id, weekStartIso })),
      );
      results.forEach((result, index) => {
        if (result?.error) {
          console.warn("[prepare-summary] weekly summary error", { error: result.error });
          return;
        }
        if (result) {
          summaryMap.set(batch[index], result);
        }
      });
    }
  }

  const chunkSummaries = weekKeys
    .map((key) => {
      const summary = summaryMap.get(key);
      if (!summary) return null;
      return { weekStart: key, summary };
    })
    .filter(Boolean);

  console.log("[prepare-summary] using weekly summaries", {
    weeks: chunkSummaries.length,
    entries: entries.length,
  });

  const mergeSummaries = async (summaries) => {
    let current = summaries;
    while (current.length > 1) {
      const merged = [];
      for (let i = 0; i < current.length; i += 2) {
        const batch = current.slice(i, i + 2);
        const response = await callLlmWithRetry({
          baseUrl,
          apiKey,
          model,
          messages: [
            { role: "system", content: buildPrepareMergePrompt(timeRangeLabel) },
            { role: "user", content: `Chunk summaries:\n${JSON.stringify(batch)}\nReturn JSON only.` },
          ],
          maxTokens: 550,
        });

        if (response.error) {
          return { error: response.error };
        }

        merged.push(response.data);
      }
      current = merged;
    }
    return { data: current[0] };
  };

  const mergeResponse = await mergeSummaries(chunkSummaries);
  if (mergeResponse.error) {
    console.warn("[prepare-summary] merge error", { error: mergeResponse.error });
    return res.status(502).json({ message: mergeResponse.error });
  }

  const parsed = mergeResponse.data;

  const topics = new Set();
  const evidenceBuckets = {
    recurringExperiences: new Set(),
    impactAreas: new Set(),
    relatedInfluences: new Set(),
    unclearAreas: new Set(),
    questionsToExplore: new Set(),
  };
  entries.forEach((entry) => {
    entry.tags?.forEach((tag) => topics.add(tag));
    entry.themes?.forEach((theme) => topics.add(theme));
    entry.triggers?.forEach((trigger) => topics.add(trigger));
    entry.emotions?.forEach((emotion) => {
      if (emotion?.label) topics.add(emotion.label);
    });
    const evidence = entry.evidenceBySection || {};
    (evidence.recurringExperiences || []).forEach((item) => evidenceBuckets.recurringExperiences.add(item));
    (evidence.impactAreas || []).forEach((item) => evidenceBuckets.impactAreas.add(item));
    (evidence.relatedInfluences || []).forEach((item) => evidenceBuckets.relatedInfluences.add(item));
    (evidence.unclearAreas || []).forEach((item) => evidenceBuckets.unclearAreas.add(item));
    (evidence.questionsToExplore || []).forEach((item) => evidenceBuckets.questionsToExplore.add(item));
  });

  const stopwords = new Set([
    "the",
    "and",
    "or",
    "to",
    "of",
    "a",
    "in",
    "is",
    "it",
    "this",
    "that",
    "my",
    "me",
    "i",
    "with",
    "for",
    "on",
    "at",
    "as",
    "be",
    "are",
    "was",
    "were",
    "about",
    "from",
    "by",
  ]);

  const tokenize = (text = "") =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, "")
      .split(/\s+/)
      .filter((token) => token && !stopwords.has(token));

  const matchQuotes = (bullet, pool) => {
    const bulletTokens = new Set(tokenize(bullet));
    const scored = pool
      .map((quote) => {
        const quoteTokens = tokenize(quote);
        const score = quoteTokens.reduce((sum, token) => (bulletTokens.has(token) ? sum + 1 : sum), 0);
        return { quote, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) return [];
    return scored.slice(0, 2).map((item) => item.quote);
  };

  const buildEvidenceBySection = (bullets, poolSet) => {
    const pool = Array.from(poolSet);
    return bullets.map((bullet) => ({
      bullet,
      quotes: matchQuotes(bullet, pool),
    }));
  };

  const buildIntensityFallback = () => {
    if (rangeDays <= 7) return ["Week 1 .."];
    if (rangeDays <= 30) return ["Week 1 ..", "Week 2 ...", "Week 4 ...."];
    return ["Week 1 ..", "Week 4 ...", "Week 8 ...."];
  };

  const normalizeOverTimeSummary = (value) => {
    const summaryText = (value || "").trim();
    const lower = summaryText.toLowerCase();
    if (summaryText && (lower.includes("week") || lower.includes("month") || lower.includes("over time"))) {
      return summaryText;
    }
    return `Across ${timeRangeLabel.toLowerCase()}, these experiences shift from day to day. Some moments feel lighter, and others feel heavier, especially when stress or sleep changes.`;
  };

  res.json({
    summary: {
      timeRangeLabel: parsed.timeRangeLabel || timeRangeLabel,
      confidenceNote: parsed.confidenceNote || "Based on patterns in written reflections",
      whySharing:
        parsed.whySharing && parsed.whySharing.trim().toLowerCase().startsWith("i ")
          ? parsed.whySharing
          : "I want to share these reflections to make it easier to explain what I've been experiencing and where I could use support.",
      recurringExperiences: parsed.recurringExperiences || [],
      overTimeSummary: normalizeOverTimeSummary(parsed.overTimeSummary),
      intensityLines: parsed.intensityLines?.length ? parsed.intensityLines : buildIntensityFallback(),
      impactAreas: parsed.impactAreas || [],
      impactNote: parsed.impactNote || "",
      relatedInfluences: parsed.relatedInfluences || [],
      unclearAreas: parsed.unclearAreas || [],
      questionsToExplore: parsed.questionsToExplore || [],
      evidenceBySection: {
        recurringExperiences: buildEvidenceBySection(
          parsed.recurringExperiences || [],
          evidenceBuckets.recurringExperiences,
        ),
        impactAreas: buildEvidenceBySection(parsed.impactAreas || [], evidenceBuckets.impactAreas),
        relatedInfluences: buildEvidenceBySection(
          parsed.relatedInfluences || [],
          evidenceBuckets.relatedInfluences,
        ),
        unclearAreas: buildEvidenceBySection(parsed.unclearAreas || [], evidenceBuckets.unclearAreas),
        questionsToExplore: buildEvidenceBySection(
          parsed.questionsToExplore || [],
          evidenceBuckets.questionsToExplore,
        ),
      },
      topics: Array.from(topics),
    },
  });
});

module.exports = {
  analyzeEntry,
  prepareSummary,
  generateEntryEvidence,
  generateClinicalEvidenceUnits,
  generateWeeklySummary,
};
