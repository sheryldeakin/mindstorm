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
    "Identify and extract text spans corresponding to the following clinical categories. You must use the specific Label codes",
    "provided below to ensure the downstream logic graph can process them.",
    "1. Depressive and Anxiety Symptoms (Core and Specifiers)",
    "- SYMPTOM_MOOD: Depressed mood, sadness, emptiness, irritability, anhedonia (loss of interest/pleasure).",
    "- SYMPTOM_COGNITIVE: Diminished concentration, indecisiveness, excessive guilt, feelings of worthlessness.",
    "- SYMPTOM_SOMATIC: Significant weight loss/gain, appetite changes, fatigue/low energy, psychomotor agitation",
    "(restlessness) or retardation (slowing down).",
    "- SYMPTOM_SLEEP: Insomnia or hypersomnia.",
    "- SYMPTOM_RISK: Recurrent thoughts of death, suicidal ideation, specific plans, or attempts.",
    "- SYMPTOM_ANXIETY: Feeling keyed up/tense, worry that makes it hard to concentrate, fear something awful may happen.",
    "2. Rule-Out and Differential Signals (Crucial for Exclusions)",
    "- SYMPTOM_MANIA: Elevated/expansive mood, inflated self-esteem/grandiosity, decreased need for sleep, racing thoughts/flight",
    "of ideas, pressured speech, increased goal-directed activity, risk-taking behavior.",
    "- SYMPTOM_PSYCHOSIS: Hallucinations (auditory/visual), delusions, paranoia, disorganized thought/speech.",
    "- SYMPTOM_TRAUMA: Flashbacks, intrusive memories of traumatic events, dissociation, derealization, depersonalization.",
    "3. Functional Impact and Context",
    "- IMPAIRMENT: Difficulty functioning in Work, School, Relationships, Self-care, or Social activities.",
    "- CONTEXT_SUBSTANCE: Use of alcohol, drugs, or medications (prescribed or recreational).",
    "- CONTEXT_MEDICAL: Mentions of physical health conditions (e.g., thyroid, pain, pregnancy).",
    "- CONTEXT_STRESSOR: Specific life events (e.g., job loss, bereavement, relationship conflict).",
    "Task B: Attribute Extraction (The How)",
    "For every extracted span, determine the following attributes. If an attribute is not explicitly stated, mark it as null.",
    "1. polarity: PRESENT if the user confirms experiencing this. ABSENT if the user explicitly denies this.",
    "2. temporality: Extract specific mentions of onset or duration (e.g., for the last 2 weeks, since childhood).",
    "3. frequency: Extract quantifiers (e.g., nearly every day, occasionally).",
    "4. severity: Extract qualitative intensity (e.g., mild, unbearable, cannot get out of bed).",
    "5. attribution: Is this symptom explicitly linked by the user to a cause?",
    "6. uncertainty: LOW for direct statements. HIGH for hedging language (e.g., maybe, I think, it is hard to say).",
    "JSON Output Schema",
    "{",
    '  "evidence_units": [',
    "    {",
    '      "span": "string (exact substring from input)",',
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
  ].join(" ");

const extractJson = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
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

const callLlm = async ({ baseUrl, apiKey, model, messages, maxTokens }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
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
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `LLM request failed: ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "No response content." };
    }

    const parsed = extractJson(content);
    if (!parsed) {
      return { error: "Failed to parse JSON response." };
    }

    return { data: parsed };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { error: "LLM request timed out." };
    }
    return { error: "LLM request failed." };
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
    return { error: response.error };
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

  const response = await callLlmWithRetry({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: "system", content: buildClinicalSignalPrompt() },
      { role: "user", content: `Patient narrative:\n${entryText}\nReturn JSON only.` },
    ],
    maxTokens: 900,
  });

  if (response.error) {
    return { error: response.error };
  }

  const evidenceUnits = Array.isArray(response.data.evidence_units) ? response.data.evidence_units : [];
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
  const entries = await Entry.find({ userId: req.user._id, dateISO: { $gte: startIso } })
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
