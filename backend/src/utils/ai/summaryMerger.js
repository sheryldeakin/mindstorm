/**
 * Extracts a balanced JSON-ish substring by bracket depth.
 * @param {string} text
 * @param {string} openChar
 * @param {string} closeChar
 * @returns {string | null}
 */
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

/**
 * Removes trailing commas before closing brackets/braces.
 * @param {string} text
 * @returns {string}
 */
const stripTrailingCommas = (text) => text.replace(/,\s*([}\]])/g, "$1");

/**
 * Sanitizes non-JSON control characters while preserving strings.
 * @param {string} text
 * @returns {string}
 */
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

/**
 * Strips Markdown code fences from the response payload.
 * @param {string} text
 * @returns {string}
 */
const stripCodeFences = (text) =>
  text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

/**
 * Attempts to parse a JSON candidate string.
 * @param {string} candidate
 * @returns {unknown | null}
 */
const parseJsonCandidate = (candidate) => {
  if (!candidate) return null;
  try {
    return JSON.parse(stripTrailingCommas(sanitizeJsonText(candidate)));
  } catch {
    return null;
  }
};

/**
 * Extracts the first-to-last JSON-ish block from a text response.
 * @param {string} text
 * @param {string} openChar
 * @param {string} closeChar
 * @returns {string | null}
 */
const extractFirstLast = (text, openChar, closeChar) => {
  const start = text.indexOf(openChar);
  const end = text.lastIndexOf(closeChar);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
};

/**
 * Extracts a JSON object/array from an LLM response.
 * @param {string} text
 * @returns {unknown | null}
 */
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

/**
 * Determines whether response_format JSON is supported for the base URL.
 * @param {string} baseUrl
 * @returns {boolean}
 */
const shouldUseJsonResponseFormat = (baseUrl) => {
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
  if (process.env.LLM_FORCE_JSON_RESPONSE_FORMAT === "true") return true;
  if (process.env.LLM_DISABLE_JSON_RESPONSE_FORMAT === "true") return false;
  return !isLocal;
};

/**
 * Calls the LLM API and attempts to parse JSON output.
 * @param {{
 *   baseUrl: string,
 *   apiKey: string,
 *   model: string,
 *   messages: Array<{ role: string, content: string }>,
 *   maxTokens?: number
 * }} options
 * @returns {Promise<{ data?: unknown, error?: string, details?: Record<string, unknown> }>}
 */
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

/**
 * Calls the LLM and retries once if JSON parsing fails.
 * @param {{
 *   baseUrl: string,
 *   apiKey: string,
 *   model: string,
 *   messages: Array<{ role: string, content: string }>,
 *   maxTokens?: number,
 *   temperature?: number
 * }} options
 * @returns {Promise<{ data?: unknown, error?: string, details?: Record<string, unknown> }>}
 */
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

/**
 * Builds the system prompt for merging chunk summaries into a patient-facing narrative.
 * @param {string} timeRangeLabel
 * @param {string} [signalContext]
 * @returns {string}
 */
const buildPrepareMergePrompt = (timeRangeLabel, signalContext) =>
  [
    "You are merging multiple chunk summaries into one patient-authored reflection summary for a clinician.",
    "Use plain language, no medical or diagnostic terms, no DSM labels, no severity scales, no causality claims.",
    "Tone: first-person, experience-first, respectful, concise. Use 'I' statements and patient voice.",
    "The whySharing field must be first-person (start with 'I') and should sound like the patient speaking.",
    "Focus on patterns, questions, and lived impact.",
    "Use the provided 'Detected Signals' as ground truth. Do not introduce themes not present in the signals.",
    "If a signal appears 3 or more times, you MUST mention it in recurringExperiences.",
    "Translate signals into patient-friendly terms (examples):",
    "SYMPTOM_MOOD -> Low mood, SYMPTOM_ANHEDONIA -> Loss of interest, SYMPTOM_COGNITIVE -> Foggy thinking or self-critical thoughts,",
    "SYMPTOM_SOMATIC -> Low energy or appetite changes, SYMPTOM_SLEEP -> Sleep changes, SYMPTOM_ANXIETY -> Anxiety or worry,",
    "IMPACT_WORK -> Work/School impact, IMPACT_SOCIAL -> Relationship strain or isolation, IMPACT_SELF_CARE -> Self-care struggles,",
    "CONTEXT_STRESSOR -> Life stressors, CONTEXT_MEDICAL -> Physical health changes, CONTEXT_SUBSTANCE -> Alcohol/substance/medication changes,",
    "SYMPTOM_MANIA -> Wired or unusually high energy, SYMPTOM_PSYCHOSIS -> Unusual perceptions or beliefs,",
    "SYMPTOM_TRAUMA -> Trauma reminders or flashbacks.",
    "For impactAreas, prefer these patient-friendly domains when relevant: Work/School, Relationships, Energy and Self-care, Motivation, Feeling safe or steady, Enjoyment and meaning.",
    "For relatedInfluences, focus on contextual factors (sleep, stress, medication changes, substances, physical health, major events) rather than life domains.",
    "Return strict JSON with keys:",
    "timeRangeLabel (string), confidenceNote (string), whySharing (string), recurringExperiences (array of strings),",
    "overTimeSummary (string), intensityLines (array of 3 short strings like 'Jan ..'), impactAreas (array of strings),",
    "impactNote (string), relatedInfluences (array of strings), unclearAreas (array of strings),",
    "questionsToExplore (array of strings), highlights (array of 2-3 short strings),",
    "shiftsOverTime (array of 2-3 short strings), contextImpactSummary (string).",
    "Start overTimeSummary with a time-range opener that matches the label (examples: 'In the last week, ...', 'In the last month, ...', 'Over the past year, ...', 'Over time, ...').",
    `Time range label: ${timeRangeLabel}.`,
    signalContext ? `Detected Signals (PRESENT counts): ${signalContext}` : "Detected Signals: none.",
  ].join(" ");

/**
 * Computes total merge operations for a binary reduce merge.
 * @param {number} count
 * @returns {number}
 */
const countMergeOps = (count) => {
  let total = 0;
  let current = count;
  while (current > 1) {
    const merges = Math.ceil(current / 2);
    total += merges;
    current = merges;
  }
  return total;
};

/**
 * Merges multiple weekly summaries into a single narrative using a map-reduce LLM flow.
 * @param {{
 *   summaries: Array<Record<string, unknown>>,
 *   timeRangeLabel?: string,
 *   signalContext?: string,
 *   evidenceHighlights?: string[],
 *   baseUrl: string,
 *   apiKey: string,
 *   model: string,
 *   onProgress?: ({ merged: number, total: number }) => void
 * }} options
 * @returns {Promise<{ data?: Record<string, unknown>, error?: string, details?: Record<string, unknown> }>}
 */
const mergeSummaries = async ({
  summaries,
  timeRangeLabel,
  signalContext,
  evidenceHighlights,
  baseUrl,
  apiKey,
  model,
  onProgress,
}) => {
  let current = summaries || [];
  if (!current.length) return { data: null };
  const totalMerges = countMergeOps(current.length);
  let mergedCount = 0;

  while (current.length > 1) {
    const merged = [];
    for (let i = 0; i < current.length; i += 2) {
      const batch = current.slice(i, i + 2);
      const evidenceLine = evidenceHighlights?.length
        ? `Evidence highlights (verbatim spans): ${evidenceHighlights.join(" | ")}`
        : null;
      const response = await callLlmWithRetry({
        baseUrl,
        apiKey,
        model,
        messages: [
          { role: "system", content: buildPrepareMergePrompt(timeRangeLabel, signalContext) },
          {
            role: "user",
            content: [evidenceLine, `Chunk summaries:\n${JSON.stringify(batch)}\nReturn JSON only.`]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        maxTokens: 750,
      });

      if (response.error) {
        return { error: response.error };
      }

      merged.push(response.data);
      mergedCount += 1;
      if (onProgress && totalMerges) {
        onProgress({ merged: mergedCount, total: totalMerges });
      }
    }
    current = merged;
  }
  return { data: current[0] };
};

module.exports = {
  buildPrepareMergePrompt,
  callLlmWithRetry,
  mergeSummaries,
};
