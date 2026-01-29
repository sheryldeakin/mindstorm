const asyncHandler = require("../utils/asyncHandler");
const { generateClinicianAppendix } = require("../utils/clinicalMetrics");
const { callLlmWithRetry } = require("../utils/ai/summaryMerger");

/**
 * Builds the base LLM prompt for entry summarization metadata.
 * @returns {string}
 */
const buildPrompt = () =>
  [
    "You are a therapist assistant that extracts structured data from a journal entry.",
    "Return strict JSON with keys: title (short 3-6 word title), emotions (array of {label, intensity 0-100, tone: positive|neutral|negative}), themes (array of short themes, 1-3 words), themeIntensities (array of {theme, intensity 0-1}), triggers (array of short phrases), summary (1-2 sentences),",
    "languageReflection (Sentence starting 'You're using strong words like...' listing 1-2 specific emotive words quoted from text),",
    "timeReflection (Sentence starting 'You mentioned...' summarizing specific duration/frequency stated in text, e.g., 'You mentioned this has been happening for a few days'). If no explicit time reference is present, return an empty string.",
    "Keep it concise and avoid long text. Use lower-case for themes/triggers. Title should be in title case.",
  ].join(" ");

/**
 * Builds the LLM prompt for patient-facing prepare summary output.
 * @param {string} timeRangeLabel
 * @returns {string}
 */
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

/**
 * Builds the LLM prompt for partial chunk summaries.
 * @param {string} timeRangeLabel
 * @param {string} [signalContext]
 * @returns {string}
 */
const buildPrepareChunkPrompt = (timeRangeLabel, signalContext) =>
  [
    "You are generating a short patient-authored summary for a subset of journal entries.",
    "Use plain language, no medical or diagnostic terms, no DSM labels, no severity scales, no causality claims.",
    "Tone: first-person, experience-first, respectful, concise. Use 'I' statements and patient voice.",
    "Use the provided 'Detected Signals' as ground truth. Do not introduce themes not present in the signals.",
    "Translate signals into patient-friendly terms (examples):",
    "SYMPTOM_MOOD -> Low mood, SYMPTOM_ANHEDONIA -> Loss of interest, SYMPTOM_COGNITIVE -> Foggy thinking or self-critical thoughts,",
    "SYMPTOM_SOMATIC -> Low energy or appetite changes, SYMPTOM_SLEEP -> Sleep changes, SYMPTOM_ANXIETY -> Anxiety or worry,",
    "IMPACT_WORK -> Work/School, IMPACT_SOCIAL -> Relationship strain or isolation, IMPACT_SELF_CARE -> Self-care struggles,",
    "CONTEXT_STRESSOR -> Life stressors, CONTEXT_MEDICAL -> Physical health changes, CONTEXT_SUBSTANCE -> Alcohol/substance/medication changes.",
    "For impactAreas, prefer these patient-friendly domains when relevant: Work/School, Relationships, Energy and Self-care, Motivation, Feeling safe or steady, Enjoyment and meaning.",
    "For relatedInfluences, focus on contextual factors (sleep, stress, medication changes, substances, physical health, major events) rather than life domains.",
    "Return strict JSON with keys:",
    "recurringExperiences (array of strings), overTimeSummary (string), intensityLines (array of 2 short strings like 'Week 1 ..'),",
    "impactAreas (array of strings), relatedInfluences (array of strings), unclearAreas (array of strings),",
    "questionsToExplore (array of strings).",
    `Time range label: ${timeRangeLabel}.`,
    signalContext ? `Detected Signals (PRESENT counts): ${signalContext}` : "Detected Signals: none.",
  ].join(" ");

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .flat(Infinity)
      .map((item) => (typeof item === "string" ? item.trim() : item == null ? "" : String(item).trim()))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }
  return [];
};

/**
 * Builds the LLM prompt for clinical Evidence Unit extraction.
 * @returns {string}
 */
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
    "- SYMPTOM_MOOD: Sadness, emptiness, irritability, tearfulness.",
    "  CRITICAL EXCLUSION: Do NOT tag 'anxiety', 'worry', 'panic', or 'feeling overwhelmed' as MOOD. These are SYMPTOM_ANXIETY.",
    "  Only tag MOOD if the core emotion is sadness, emptiness, or melancholy.",
    " Note if the mood is described as 'worse in the morning' (Melancholic feature).",
    " *CRITICAL: 'Feeling empty' or 'numb' counts as PRESENT mood pathology.*",
    " **Also note 'Mood Reactivity': Does the text explicitly say mood 'brightened' or they 'felt better' temporarily due to positive events? (Atypical feature).**",
    "- SYMPTOM_ANHEDONIA: Loss of interest, 'don't care anymore', 'nothing is fun'.",
    "  CRITICAL: Do NOT tag 'stress', 'burnout', or 'feeling overwhelmed' as ANHEDONIA. These are ANXIETY or CONTEXT_STRESSOR.",
    "  CRITICAL EXCLUSION: Do NOT tag 'overwhelmed' or 'too busy' as ANHEDONIA. Anhedonia is a lack of desire or pleasure, not a lack of capacity due to stress.",
    "  Use ANHEDONIA for internal state: lack of feeling/interest/pleasure.",
    "  Examples: 'Didn't care about seeing them', 'Felt bored with my friends', 'Nothing was fun', 'Just went through the motions'.",
    "- SYMPTOM_COGNITIVE: Diminished concentration, indecisiveness, brain fog, feelings of worthlessness.",
    " Include 'guilt' only if excessive or inappropriate (e.g., 'I am a bad person'). Do NOT tag rational guilt. For example, missing work due to illness/fatigue.",
    " If user says 'I am lazy', check if it implies SYMPTOM_FATIGUE or SYMPTOM_COGNITIVE (self-criticism).",
    "- SYMPTOM_SOMATIC: Weight changes, appetite changes, fatigue, heavy limbs ('leaden paralysis'), psychomotor retardation (moving/speaking slowly).",
    "  INTERNAL ONLY: Tag only bodily sensations (e.g., 'I feel heavy', 'my heart is pounding').",
    "  EXCLUDE EXTERNAL: Do NOT tag environmental descriptions like 'loud room', 'messy house', or 'cold weather' as SOMATIC. These are CONTEXT_ENVIRONMENT.",
    " For 'agitation', only tag physical movements (pacing, inability to sit still).",
    " Tag subjective 'restlessness' or 'feeling on edge' as SYMPTOM_ANXIETY.",
    "- SYMPTOM_SLEEP: Insomnia (falling asleep difficulty OR waking too early), Hypersomnia (sleeping too much).",
    " If 'waking up too early' or 'waking up in the middle of the night' is mentioned, capture it explicitly as SYMPTOM_SLEEP.",
    " Tag 'nightmares' as SYMPTOM_SLEEP and tag as SYMPTOM_TRAUMA if the nightmare is extreme to the point of distress.",
    "- SYMPTOM_RISK: Thoughts of death, suicidal ideation, specific plans, or attempts, self-harm. **Critical Safety Signal**.",
    " DO NOT tag idioms (e.g., 'killing me'). DO NOT tag 'fear of dying' or 'fear of doom' (Panic symptoms) as RISK—only tag wanting to die or active self-harm.",
    "- SYMPTOM_ANXIETY: Feeling keyed up/tense, worry, tension, panic, subjective restlessness, fear something awful may happen.",
    "**Include 'feeling overwhelmed', 'overstimulation', 'stressed out', 'burned out', or 'feeling out of control'. Include 'hypervigilance' or 'jumpy/startle response' (PTSD signals).**",

    "2. Differential & Rule-Out Signals (Distinguish Diagnosis):",
    "- SYMPTOM_MANIA: Elevated/expansive mood, inflated self-esteem/grandiosity, decreased need for sleep, racing thoughts, pressured speech (talking fast/can't stop)", 
    " DO NOT label 'irritability' or 'social withdrawal' as MANIA unless accompanied by high energy, sleeplessness, or racing thoughts. 'Needing space' is typically SOCIAL_IMPACT or MOOD, not MANIA.",
    " **CRITICAL:** Do NOT tag 'productive day' or 'cleaning the house' as MANIA unless accompanied by a *decreased need for sleep* (e.g., feeling rested after 3 hours).",
    " If they are sleeping normal hours, this is likely recovery, not mania.",
    " DO NOT tag 'mood swings' or 'erratic mood' as MANIA—only sustained high energy/euphoria.",
    " If racing thoughts, high energy, or decreased sleep appear alongside depressive content (mixed features), still tag those specific spans as SYMPTOM_MANIA.",
    "- SYMPTOM_PSYCHOSIS: Hallucinations (auditory/visual), delusions, disorganization.",
    " DO NOT tag 'inner critic', 'inner voice' (internal monologue), or colloquial 'paranoia' (social worry) as PSYCHOSIS. Only tag clear breaks from reality.",
    "- SYMPTOM_TRAUMA: Flashbacks, intrusive memories of traumatic events, dissociation (feeling 'unreal'), derealization, depersonalization.",

    "3. Functional Impact (Gate Criteria):",
    "*Split general impairment into these specific domains:*",
    "- IMPACT_WORK: Missed work, poor performance, failing classes.",
    "- IMPACT_SOCIAL: Behavior/Consequence (actions or failure to act).",
    "  Examples: 'Cancelled plans', 'Ignoring texts', 'Ghosted everyone', 'Stayed in my room', 'Isolated myself'.",
    "  Rule of thumb: If they avoided doing it or it disrupted relationships, tag IMPACT_SOCIAL.",
    "- IMPACT_SELF_CARE: Hygiene (shower/teeth), skipping meals, messy environment.",

    "4. Context Factors:", 
    "- CONTEXT_SUBSTANCE: Use of alcohol, drugs, or medications (prescribed or recreational).",
    " **CRITICAL:** Do NOT tag transient physical hangovers unless they trigger mood/anxiety symptoms (e.g., 'hangxiety', 'crash', 'withdrawal depression'). If substance use drives mood, tag it. Ignore incidental use.",
    "- CONTEXT_MEDICAL: Mentions of physical health conditions (e.g., thyroid, pain, pregnancy)",
    " OR specific reproductive status (pregnancy, postpartum, breastfeeding) to support Peripartum specifier detection.",
    "- CONTEXT_STRESSOR: Grief, job loss, breakup/relationship conflict, specific life events.",
    "**Distinguish 'Grief' (emptiness/loss focused on the deceased) from 'Depression' (self-critical/worthlessness). If the focus is missing someone, tag STRESSOR. If the focus is self-loathing, tag SYMPTOM_COGNITIVE.**",  
    
    "5. Life Context & Environment (Reflective Only - Not Clinical):",
    "- CONTEXT_ROUTINE: Mention of daily habits (chores, commute, meals).",
    "- CONTEXT_ENVIRONMENT: Sensory details (noise, weather, clutter, light).",
    "- CONTEXT_SOCIAL_INTERACTION: Casual interactions (chatting, texting, meeting).",
    "- CONTEXT_LOCATION: Specific places mentioned (school, work, home).",
    "- IMPACT_WORK: Struggles at school or job. Example: 'felt anxious at school', 'couldn't study'.",

    "Task B: Attribute Extraction (The How)",
    
    "For every extracted span, determine the following attributes. If an attribute is not explicitly stated, mark it as null.",
    "1. polarity: 'PRESENT' or 'ABSENT'.",
    "   - CRITICAL: 'I feel empty', 'I feel nothing', or 'I have no energy' = PRESENT.",
    "   - For loss-based symptoms (e.g., SYMPTOM_ANHEDONIA, SYMPTOM_COGNITIVE/Memory Loss):",
    "     - 'I have no interest' -> Polarity is PRESENT.",
    "     - 'I still enjoy my hobbies' -> Polarity is ABSENT.",
    "   - For SYMPTOM_SOMATIC (Energy/Fatigue):",
    "     - 'I have no energy', 'I feel drained', or 'zero motivation' -> Polarity is PRESENT.",
    "     - 'My energy is fine' or 'I feel energetic' -> Polarity is ABSENT.",
    "   - For SYMPTOM_SOMATIC (Appetite):",
    "     - 'No appetite', 'Can't eat', or 'Lost my appetite' -> Polarity is PRESENT.",
    "     - 'Eating normally' -> Polarity is ABSENT.",
    "   - For SYMPTOM_SLEEP:",
    "     - 'Didn't sleep', 'Can't sleep', or 'Up all night' -> Polarity is PRESENT.",
    "     - 'Slept fine' -> Polarity is ABSENT.",
    "   - For SYMPTOM_COGNITIVE (Concentration/Indecision):",
    "     - 'No focus', 'Can't think', 'Mind is blank', or 'Can't make decisions' -> Polarity is PRESENT.",
    "     - 'My focus is sharp' -> Polarity is ABSENT.",
    "   - For IMPACT_SOCIAL / SYMPTOM_ANHEDONIA (Withdrawal):",
    "     - 'No social energy', 'Ignoring everyone', 'Didn't text back', or 'Hiding' -> Polarity is PRESENT.",
    "     - 'I felt social' or 'I saw friends' -> Polarity is ABSENT.",
    "   - ONLY use ABSENT if the user explicitly denies a symptom (e.g., 'I am NOT sad', 'Sleep was fine', 'No dark thoughts').",
    "2. temporality: onset or duration (e.g., for the last 2 weeks, since childhood).",
    "3. frequency: How often it happens (e.g., 'every night', 'sometimes').",
    "4. severity: Normalize to 'MILD', 'MODERATE', or 'SEVERE' where possible. If ambiguous, use the exact descriptor.",
    "   - For SYMPTOM_RISK: Explicitly distinguish 'Passive' (thoughts) vs 'Active' (intent/plan).",
    "5. attribution: If the user links the symptom to a cause (e.g., 'because of my meds', 'from the alcohol', 'withdrawal').",
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

/**
 * Builds the LLM prompt for high-recall span scanning.
 * @returns {string}
 */
const buildScannerPrompt = () =>
  [
    "System Prompt: Clinical Signal Span Scanner",
    "Role: You extract verbatim text spans and assign a label code. Do not infer attributes.",
    "Return strict JSON with key candidates.",
    "Extract spans for ANY of these categories using the exact label codes:",
    "Symptoms:",
    "- SYMPTOM_MOOD (low mood, sadness, emptiness)",
    "- SYMPTOM_ANHEDONIA (loss of interest/pleasure)",
    "- SYMPTOM_MANIA (high energy, racing thoughts, little sleep)",
    "- SYMPTOM_ANXIETY (worry, tension, panic, overwhelmed)",
    "- SYMPTOM_TRAUMA (flashbacks, dissociation)",
    "- SYMPTOM_PSYCHOSIS (hallucinations, delusions)",
    "- SYMPTOM_SLEEP (insomnia, hypersomnia)",
    "- SYMPTOM_SOMATIC (energy, appetite, physical changes)",
    "- SYMPTOM_COGNITIVE (focus, indecision, self-criticism)",
    "- SYMPTOM_RISK (thoughts of death, self-harm)",
    "Impact:",
    "- IMPACT_WORK, IMPACT_SOCIAL, IMPACT_SELF_CARE, IMPACT_SAFETY",
    "Context:",
    "- CONTEXT_SUBSTANCE, CONTEXT_MEDICAL, CONTEXT_STRESSOR, CONTEXT_ROUTINE, CONTEXT_ENVIRONMENT,",
    "- CONTEXT_SOCIAL_INTERACTION, CONTEXT_LOCATION",
    "Constraints:",
    "- Use exact substrings from the input.",
    "- Do not assign polarity, severity, or attributes.",
    "- Return at most 20 candidates. Keep each span under 260 characters.",
    'Output JSON: { "candidates": [ { "span": "...", "label": "CODE" } ] }',
  ].join(" ");

/**
 * Builds the LLM prompt for attribute analysis over candidate spans.
 * @returns {string}
 */
const buildAnalyzerPrompt = () =>
  [
    "System Prompt: Clinical Signal Analyzer",
    "Role: You analyze provided candidate spans and determine validity + attributes.",
    "Use the original entry text to interpret each candidate.",
    "If a candidate is not a real clinical signal, omit it from output.",
    "Return strict JSON with key evidence_units only.",

    "Attribute rules:",
    "1. polarity: 'PRESENT' or 'ABSENT'.",
    "   - Loss/deficit statements mean PRESENT (e.g., 'no energy', 'no focus', 'can't sleep').",
    "   - ONLY use ABSENT if the user explicitly denies the symptom (e.g., 'sleep was fine').",
    "   - For SYMPTOM_ANHEDONIA: 'no interest' => PRESENT; 'still enjoy' => ABSENT.",
    "   - For SYMPTOM_SOMATIC (Energy/Fatigue): 'no energy', 'drained' => PRESENT; 'energetic' => ABSENT.",
    "   - For SYMPTOM_SOMATIC (Appetite): 'no appetite' => PRESENT; 'eating normally' => ABSENT.",
    "   - For SYMPTOM_SLEEP: 'didn't sleep', 'up all night' => PRESENT; 'slept fine' => ABSENT.",
    "   - For SYMPTOM_COGNITIVE: 'no focus', 'can't think' => PRESENT; 'focus is sharp' => ABSENT.",
    "   - For IMPACT_SOCIAL / SYMPTOM_ANHEDONIA (Withdrawal): 'ignoring everyone' => PRESENT; 'felt social' => ABSENT.",
    "2. temporality: onset/duration if stated.",
    "3. frequency: how often if stated.",
    "4. severity: 'MILD' | 'MODERATE' | 'SEVERE' when possible; otherwise use exact descriptor.",
    "   - For SYMPTOM_RISK: distinguish PASSIVE vs ACTIVE in severity.",
    "5. attribution: stated cause if present (e.g., 'because of meds').",
    "6. uncertainty: LOW for direct statements, HIGH for hedging.",

    "Critical logic:",
    "- Loss vs absence: 'no energy', 'no focus', 'can't sleep' => PRESENT.",
    "- Impact vs symptom: behaviors/actions are IMPACT; internal feelings are SYMPTOM.",
    "- Use candidate.label as the label unless it is clearly incorrect; do not invent new labels.",

    "Output schema:",
    "{",
    '  "evidence_units": [',
    '    { "span": "exact substring", "label": "CODE", "attributes": {',
    '      "polarity": "PRESENT" | "ABSENT",',
    '      "temporality": "string" | null,',
    '      "frequency": "string" | null,',
    '      "severity": "string" | null,',
    '      "attribution": "string" | null,',
    '      "uncertainty": "LOW" | "HIGH"',
    "    } }",
    "  ]",
    "}",
  ].join(" ");

/**
 * Builds the LLM prompt for evidence snippet extraction.
 * @returns {string}
 */
const buildEntryEvidencePrompt = () =>
  [
    "You are extracting short evidence snippets from a single journal entry.",
    "Use exact phrases from the entry. No diagnosis terms. No interpretations.",
    "Return strict JSON with keys:",
    "recurringExperiences (array of short quotes), impactAreas (array of short quotes), relatedInfluences (array of short quotes),",
    "unclearAreas (array of short quotes), questionsToExplore (array of short quotes).",
  ].join(" ");

/**
 * Extracts balanced JSON-like substrings by bracket depth.
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
 * Removes trailing commas before closing braces/brackets.
 * @param {string} text
 * @returns {string}
 */
const stripTrailingCommas = (text) => text.replace(/,\s*([}\]])/g, "$1");

/**
 * Sanitizes control characters in JSON strings while preserving content.
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
 * Attempts to parse a partial JSON array by trimming to last complete object.
 * @param {string} text
 * @returns {unknown[] | null}
 */
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

/**
 * Removes Markdown code fences from LLM output.
 * @param {string} text
 * @returns {string}
 */
const stripCodeFences = (text) =>
  text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

/**
 * Parses a JSON candidate string with sanitization.
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
 * Extracts the first-to-last bracketed region in a text blob.
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
 * Extracts a JSON object/array from freeform model output.
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

const normalizeEmotions = (emotions) => {
  if (!Array.isArray(emotions)) return [];
  return emotions
    .map((emotion) => {
      if (!emotion || typeof emotion !== "object") return null;
      const label = typeof emotion.label === "string" ? emotion.label.trim() : "";
      if (!label) return null;
      const intensity = Number.isFinite(emotion.intensity) ? emotion.intensity : 0;
      const toneKey = typeof emotion.tone === "string" ? emotion.tone.trim().toLowerCase() : "";
      const tone = (
        {
          positive: "positive",
          neutral: "neutral",
          negative: "negative",
          heavy: "negative",
        }[toneKey] || "neutral"
      );
      return {
        label,
        intensity,
        tone,
      };
    })
    .filter(Boolean);
};

/**
 * Returns ISO week start (Monday) for a dateISO string.
 * @param {string} dateIso
 * @returns {string}
 */
const getWeekStartIso = (dateIso) => {
  const [year, month, day] = dateIso.split("-").map((value) => Number(value));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
};

/**
 * Returns ISO week end (Sunday) for a week start ISO string.
 * @param {string} weekStartIso
 * @returns {string}
 */
const getWeekEndIso = (weekStartIso) => {
  const [year, month, day] = weekStartIso.split("-").map((value) => Number(value));
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().slice(0, 10);
};

/**
 * Aggregates PRESENT evidence unit counts by label.
 * @param {Array<{ evidenceUnits?: Array<{ label?: string, attributes?: { polarity?: string }, polarity?: string }> }>} signals
 * @returns {Map<string, number>}
 */
const aggregateEvidenceUnits = (signals) => {
  const counts = new Map();
  if (!Array.isArray(signals)) return counts;
  signals.forEach((signal) => {
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    units.forEach((unit) => {
      const label = typeof unit?.label === "string" ? unit.label.trim() : "";
      if (!label) return;
      const polarity = unit?.attributes?.polarity || unit?.polarity;
      if (polarity !== "PRESENT") return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });
  return counts;
};

/**
 * Formats label counts into a prompt-ready signal context string.
 * @param {Map<string, number>} counts
 * @returns {string}
 */
const buildSignalContext = (counts) => {
  const entries = Array.from(counts.entries());
  if (!entries.length) return "";
  return entries
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
};

/**
 * Collects top evidence spans for prompt grounding.
 * @param {Array<{ evidenceUnits?: Array<{ span?: string, label?: string, attributes?: Record<string, unknown> }> }>} signals
 * @param {number} [limit=6]
 * @returns {string[]}
 */
const buildEvidenceHighlights = (signals, limit = 6) => {
  const scored = [];
  const seen = new Set();
  const severityScore = (value) => {
    if (!value) return 0;
    const normalized = String(value).toUpperCase();
    if (normalized === "SEVERE") return 2;
    if (normalized === "MODERATE") return 1;
    return 0;
  };

  signals.forEach((signal) => {
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    units.forEach((unit) => {
      if (!unit?.span) return;
      if (unit.attributes?.polarity !== "PRESENT") return;
      if (unit.attributes?.uncertainty && unit.attributes.uncertainty !== "LOW") return;
      const key = `${signal.dateISO}::${unit.label}::${unit.span}`;
      if (seen.has(key)) return;
      seen.add(key);
      const score = severityScore(unit.attributes?.severity);
      scored.push({ span: unit.span, score, dateISO: signal.dateISO || "" });
    });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.dateISO.localeCompare(b.dateISO))
    .slice(0, limit)
    .map((item) => item.span);
};

/**
 * Determines whether to request JSON response_format for the given base URL.
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
 * Calls the LLM chat completion API without parsing JSON content.
 * @param {{ baseUrl: string, apiKey: string, model: string, messages: Array<{ role: string, content: string }>, maxTokens: number }} options
 * @returns {Promise<{ content?: string, error?: string, details?: Record<string, unknown> }>}
 */
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

/**
 * Resolves after the specified delay in milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls the raw LLM endpoint with retry/backoff for transient failures.
 * @param {{ baseUrl: string, apiKey: string, model: string, messages: Array<{ role: string, content: string }>, maxTokens: number, retries?: number }} options
 * @returns {Promise<{ content?: string, error?: string, details?: Record<string, unknown> }>}
 */
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

const normalizeCandidateUnits = (units) => {
  if (!Array.isArray(units)) return [];
  const normalized = units
    .filter((unit) => unit && typeof unit === "object")
    .map((unit) => ({
      span: typeof unit.span === "string" ? unit.span.trim() : "",
      label: typeof unit.label === "string" ? unit.label.trim() : "",
    }))
    .filter((unit) => unit.span && unit.label);

  const seen = new Set();
  return normalized.filter((unit) => {
    const key = `${unit.label}::${unit.span}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeEvidenceUnits = (units) => {
  if (!Array.isArray(units)) return [];
  const normalized = units
    .filter((unit) => unit && typeof unit === "object")
    .map((unit) => ({
      span: typeof unit.span === "string" ? unit.span.trim() : "",
      label: typeof unit.label === "string" ? unit.label.trim() : "",
      attributes: unit.attributes && typeof unit.attributes === "object" ? unit.attributes : {},
    }))
    .filter((unit) => unit.span && unit.label);

  const seen = new Set();
  return normalized.filter((unit) => {
    const key = `${unit.label}::${unit.span}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const parseScannerPayload = (content) => {
  const parsed = extractJson(content);
  if (!parsed) return null;
  if (Array.isArray(parsed)) return { candidates: parsed };
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.candidates)) return parsed;
  return null;
};

const parseAnalyzerPayload = (content) => {
  const parsed = extractJson(content);
  if (!parsed) return null;
  if (Array.isArray(parsed)) return { evidence_units: parsed };
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.evidence_units)) return parsed;
  return null;
};

/**
 * Legacy Evidence Unit extraction (single-pass prompt).
 * Preserved for benchmarking comparisons.
 * @param {string} entryText
 * @returns {Promise<{evidenceUnits?: Array<object>, error?: string, details?: object}>}
 */
const generateClinicalEvidenceUnitsLegacy = async (entryText) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
  }

  /**
   * Builds the LLM message array for clinical extraction.
   * @param {boolean} retry
   * @returns {Array<{ role: string, content: string }>}
   */
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

  /**
   * Normalizes code-fenced LLM output before JSON parsing.
   * @param {string} content
   * @returns {string}
   */
  const normalizeJsonText = (content) => {
    if (!content) return "";
    let cleaned = content.trim();
    cleaned = cleaned.replace(/```json/i, "```").replace(/```/g, "");
    return cleaned.trim();
  };

  /**
   * Parses the LLM response into the expected evidence_units structure.
   * @param {string} content
   * @returns {{ evidence_units?: Array<object> } | null}
   */
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

  const evidenceUnits = normalizeEvidenceUnits(parsed.evidence_units);
  if (Array.isArray(parsed.evidence_units) && parsed.evidence_units.length && !evidenceUnits.length) {
    return {
      error: "Invalid evidence_units format.",
      details: { sampleTypes: parsed.evidence_units.slice(0, 3).map((unit) => typeof unit) },
    };
  }

  return { evidenceUnits };
};

const runScanner = async (entryText) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
  }

  const buildMessages = (retry) => [
    { role: "system", content: buildScannerPrompt() },
    {
      role: "user",
      content: [
        `Patient narrative:\n${entryText}`,
        "Return JSON only.",
        retry ? "Your last response was not valid JSON. Return an object with key candidates only." : null,
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
    maxTokens: 900,
  });

  if (response.error) {
    return { error: response.error, details: response.details };
  }

  let parsed = parseScannerPayload(response.content);
  if (!parsed) {
    const retry = await callLlmRawWithRetry({
      baseUrl,
      apiKey,
      model,
      messages: buildMessages(true),
      maxTokens: 900,
    });
    if (retry.error) {
      return { error: retry.error, details: retry.details };
    }
    parsed = parseScannerPayload(retry.content);
  }

  if (!parsed) {
    const debug = process.env.LLM_DEBUG_PARSE === "true";
    return {
      error: "Failed to parse JSON response.",
      details: debug ? { contentSnippet: (response.content || "").slice(0, 800) } : undefined,
    };
  }

  const candidates = normalizeCandidateUnits(parsed.candidates);
  if (Array.isArray(parsed.candidates) && parsed.candidates.length && !candidates.length) {
    return {
      error: "Invalid candidates format.",
      details: { sampleTypes: parsed.candidates.slice(0, 3).map((unit) => typeof unit) },
    };
  }

  return { candidates };
};

const runAnalyzer = async (entryText, candidates) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
  }

  const buildMessages = (retry) => [
    { role: "system", content: buildAnalyzerPrompt() },
    {
      role: "user",
      content: [
        `Patient narrative:\n${entryText}`,
        `Candidates:\n${JSON.stringify(candidates, null, 2)}`,
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

  let parsed = parseAnalyzerPayload(response.content);
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
    parsed = parseAnalyzerPayload(retry.content);
  }

  if (!parsed) {
    const debug = process.env.LLM_DEBUG_PARSE === "true";
    return {
      error: "Failed to parse JSON response.",
      details: debug ? { contentSnippet: (response.content || "").slice(0, 800) } : undefined,
    };
  }

  const evidenceUnits = normalizeEvidenceUnits(parsed.evidence_units);
  if (Array.isArray(parsed.evidence_units) && parsed.evidence_units.length && !evidenceUnits.length) {
    return {
      error: "Invalid evidence_units format.",
      details: { sampleTypes: parsed.evidence_units.slice(0, 3).map((unit) => typeof unit) },
    };
  }

  return { evidenceUnits };
};

/**
 * Extract Evidence Units (clinical signals) using scanner/analyzer pipeline.
 * @param {string} entryText
 * @returns {Promise<{evidenceUnits?: Array<object>, error?: string, details?: object}>}
 */
const generateClinicalEvidenceUnitsV2 = async (entryText) => {
  const scan = await runScanner(entryText);
  if (scan.error) return scan;

  const candidates = scan.candidates || [];
  if (!candidates.length) {
    return { evidenceUnits: [] };
  }

  const analysis = await runAnalyzer(entryText, candidates);
  if (analysis.error) return analysis;
  return { evidenceUnits: analysis.evidenceUnits || [] };
};

const generateClinicalEvidenceUnits = async (entryText) =>
  generateClinicalEvidenceUnitsLegacy(entryText);

/**
 * Extract patient-authored evidence snippets by section from a single entry.
 * Prompt strategy: quote-level extraction with no interpretation, strict JSON output.
 * @param {string} entryText
 * @returns {Promise<{evidenceBySection?: Record<string, string[]>, error?: string, details?: object}>}
 */
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

/**
 * Generate and persist a weekly patient-facing summary for the given user and week.
 * Prompt strategy: grounded weekly summary using detected signals + entry text.
 * @param {{ userId: import("mongoose").Types.ObjectId | string, weekStartIso: string }} params
 * @returns {Promise<object|null|{error: string}>} Weekly summary object or null/error.
 */
const generateWeeklySummary = async ({ userId, weekStartIso }) => {
  const normalizedWeekStart = getWeekStartIso(weekStartIso);
  const Entry = require("../models/Entry");
  const WeeklySummary = require("../models/WeeklySummary");
  const EntrySignals = require("../derived/models/EntrySignals");
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
  const weekSignals = await EntrySignals.find({
    userId,
    dateISO: { $gte: normalizedWeekStart, $lte: weekEndIso },
  }).lean();
  const signalCounts = aggregateEvidenceUnits(weekSignals);
  const signalContext = buildSignalContext(signalCounts);
  const evidenceHighlights = buildEvidenceHighlights(weekSignals);
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
      { role: "system", content: buildPrepareChunkPrompt(timeRangeLabel, signalContext) },
      {
        role: "user",
        content: [
          evidenceHighlights.length
            ? `Evidence highlights (verbatim spans): ${evidenceHighlights.join(" | ")}`
            : null,
          `Journal entries:\n${entryText}\nReturn JSON only.`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    maxTokens: 450,
  });

  if (response.error) {
    return { error: response.error };
  }

  const summary = {
    recurringExperiences: normalizeStringArray(response.data.recurringExperiences),
    overTimeSummary: typeof response.data.overTimeSummary === "string" ? response.data.overTimeSummary : "",
    intensityLines: normalizeStringArray(response.data.intensityLines),
    impactAreas: normalizeStringArray(response.data.impactAreas),
    relatedInfluences: normalizeStringArray(response.data.relatedInfluences),
    unclearAreas: normalizeStringArray(response.data.unclearAreas),
    questionsToExplore: normalizeStringArray(response.data.questionsToExplore),
  };

  await WeeklySummary.findOneAndUpdate(
    { userId, weekStartISO: normalizedWeekStart },
    { weekStartISO: normalizedWeekStart, weekEndISO: weekEndIso, summary },
    { upsert: true, new: true },
  );

  return summary;
};

/**
 * Analyze a journal entry and return structured themes, emotions, and a short summary.
 * Prompt strategy: single-pass extraction into strict JSON for downstream use.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { analysis } JSON or an error status.
 */
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
      max_tokens: 420,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ message: `LLM request failed: ${errorText}` });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  console.log("[ai/analyze] raw LLM content:", content);
  if (!content) {
    return res.status(502).json({ message: "No analysis returned." });
  }

  const parsed = extractJson(content);
  if (!parsed) {
    return res.status(502).json({ message: "Failed to parse analysis JSON." });
  }
  console.log("[ai/analyze] parsed JSON:", parsed);

  let normalized = parsed;
  if (Array.isArray(parsed)) {
    const normalizedEmotions = normalizeEmotions(parsed);
    normalized = {
      emotions: normalizedEmotions,
      themes: [],
      themeIntensities: [],
      triggers: [],
      summary: undefined,
      title: undefined,
    };
  }
  console.log("[ai/analyze] normalized emotions:", normalizeEmotions(normalized.emotions));

  res.json({
    analysis: {
      title: normalized.title,
      emotions: normalizeEmotions(normalized.emotions),
      themes: normalized.themes || [],
      themeIntensities: normalized.themeIntensities || [],
      triggers: normalized.triggers || [],
      summary: normalized.summary,
      languageReflection: normalized.languageReflection,
      timeReflection: normalized.timeReflection,
    },
  });
});

/**
 * Analyze entry text and return legacy patient signals.
 * @param {string} text
 * @returns {Promise<{ data?: { emotions?: Array<object>, themes?: string[], themeIntensities?: Array<object>, triggers?: string[] }, error?: string }>}
 */
const generateLegacyEntryAnalysis = async (text) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { error: "OPENAI_API_KEY is not set." };
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
      max_tokens: 240,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `LLM request failed: ${errorText}` };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { error: "No analysis returned." };
  }

  const parsed = extractJson(content);
  if (!parsed) {
    return { error: "Failed to parse analysis JSON." };
  }

  return {
    data: {
      title: parsed.title,
      summary: parsed.summary,
      emotions: normalizeEmotions(parsed.emotions),
      themes: parsed.themes || [],
      themeIntensities: parsed.themeIntensities || [],
      triggers: parsed.triggers || [],
      languageReflection: parsed.languageReflection,
      timeReflection: parsed.timeReflection,
    },
  };
};

/**
 * Maps a day range to a canonical range key.
 * @param {number} rangeDays
 * @returns {string}
 */
const rangeDaysToRangeKey = (rangeDays) => {
  if (rangeDays <= 7) return "last_7_days";
  if (rangeDays <= 30) return "last_30_days";
  if (rangeDays <= 90) return "last_90_days";
  if (rangeDays <= 365) return "last_365_days";
  return "all_time";
};

/**
 * Returns the dateISO lower bound for a range key.
 * @param {string} rangeKey
 * @returns {string | null}
 */
const getRangeStartIsoFromKey = (rangeKey) => {
  if (!rangeKey || rangeKey === "all_time") return null;
  const days =
    rangeKey === "last_365_days"
      ? 365
      : rangeKey === "last_90_days"
        ? 90
        : rangeKey === "last_7_days"
          ? 7
          : 30;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return start.toISOString().slice(0, 10);
};

/**
 * Builds a human-friendly label for a range key.
 * @param {string} rangeKey
 * @returns {string}
 */
const buildTimeRangeLabel = (rangeKey) => {
  switch (rangeKey) {
    case "last_7_days":
      return "Last 7 days";
    case "last_30_days":
      return "Last 30 days";
    case "last_90_days":
      return "Last 90 days";
    case "last_365_days":
      return "Last 12 months";
    case "all_time":
      return "All time";
    default:
      return "Last 30 days";
  }
};

/**
 * Serve a cached patient summary + clinician appendix for a given range.
 * Prompt strategy: uses background map-reduce style merge of weekly summaries
 * into a narrative snapshot; this handler only reads cached results.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} Responds with { summary, appendix, stale } or 202 if generating.
 */
const prepareSummary = asyncHandler(async (req, res) => {
  const rangeDays = Number.parseInt(req.body?.rangeDays, 10) || 56;
  const rangeKey = rangeDaysToRangeKey(rangeDays);
  const startIso = getRangeStartIsoFromKey(rangeKey);
  const endIso = new Date().toISOString().slice(0, 10);

  const SnapshotSummary = require("../derived/models/SnapshotSummary");
  const EntrySignals = require("../derived/models/EntrySignals");
  const Entry = require("../models/Entry");
  const { recomputeSnapshotForUser } = require("../derived/services/snapshotRecompute");

  const freshSnapshot = await SnapshotSummary.findOne({
    userId: req.user._id,
    rangeKey,
    stale: false,
  }).lean();

  let snapshotDoc = freshSnapshot;
  let stale = false;
  if (!snapshotDoc) {
    snapshotDoc = await SnapshotSummary.findOne({ userId: req.user._id, rangeKey }).lean();
    stale = Boolean(snapshotDoc);
    setImmediate(async () => {
      try {
        await recomputeSnapshotForUser({ userId: req.user._id, rangeKey });
      } catch (err) {
        console.warn("[prepare-summary] snapshot recompute failed", err?.message || err);
      }
    });
  }

  if (!snapshotDoc) {
    return res.status(202).json({
      summary: null,
      appendix: generateClinicianAppendix([]),
      stale: true,
      generating: true,
    });
  }

  const entryQuery = startIso ? { userId: req.user._id, dateISO: { $gte: startIso } } : { userId: req.user._id };
  const entries = await Entry.find({ ...entryQuery, deletedAt: null })
    .sort({ dateISO: 1 })
    .lean();

  const signalQuery = startIso
    ? { userId: req.user._id, dateISO: { $gte: startIso, $lte: endIso } }
    : { userId: req.user._id };
  const signals = await EntrySignals.find(signalQuery).lean();

  const signalEntries = signals.map((signal) => ({
    dateISO: signal.dateISO,
    evidenceUnits: Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [],
  }));
  const highUncertaintyEvidence = signals.flatMap((signal) => {
    const units = Array.isArray(signal.evidenceUnits) ? signal.evidenceUnits : [];
    return units
      .filter((unit) => unit?.attributes?.uncertainty === "HIGH")
      .map((unit) => ({
        quote: unit.span,
        date: signal.dateISO,
        label: unit.label,
      }));
  });
  const appendix = {
    ...generateClinicianAppendix(signalEntries),
    highUncertaintyEvidence,
  };

  const narrative = snapshotDoc.snapshot?.narrative || {};
  const timeRangeLabel = narrative.timeRangeLabel || buildTimeRangeLabel(rangeKey);

  const topics = new Set();
  const evidenceUnits = [];
  entries.forEach((entry) => {
    entry.tags?.forEach((tag) => topics.add(tag));
    entry.themes?.forEach((theme) => topics.add(theme));
    entry.triggers?.forEach((trigger) => topics.add(trigger));
    entry.emotions?.forEach((emotion) => {
      if (emotion?.label) topics.add(emotion.label);
    });
    (entry.evidenceUnits || []).forEach((unit) => {
      if (!unit?.span || !unit?.label) return;
      evidenceUnits.push({ ...unit, dateISO: entry.dateISO });
    });
  });

  /**
   * Filters evidence units by summary section.
   * @param {string} sectionKey
   * @returns {Array<{ label: string, span: string, attributes?: Record<string, unknown>, dateISO?: string }>}
   */
  const getSectionEvidence = (sectionKey) => {
    if (sectionKey === "recurringExperiences") {
      return evidenceUnits.filter((unit) => unit.label.startsWith("SYMPTOM_"));
    }
    if (sectionKey === "impactAreas") {
      return evidenceUnits.filter((unit) => unit.label.startsWith("IMPACT_"));
    }
    if (sectionKey === "relatedInfluences") {
      return evidenceUnits.filter((unit) => unit.label.startsWith("CONTEXT_"));
    }
    return [];
  };

  /**
   * Assigns a numeric score for severity ordering.
   * @param {string} severity
   * @returns {number}
   */
  const severityScore = (severity) => {
    if (!severity) return 0;
    const normalized = String(severity).toUpperCase();
    if (normalized === "SEVERE") return 2;
    if (normalized === "MODERATE") return 1;
    return 0;
  };

  /**
   * Ranks evidence units for a section by polarity/severity.
   * @param {string} sectionKey
   * @returns {Array<{ span: string, score: number, dateISO: string }>}
   */
  const rankEvidence = (sectionKey) => {
    const pool = getSectionEvidence(sectionKey);
    if (!pool.length) return [];
    return pool
      .map((unit) => {
        const polarityScore = unit.attributes?.polarity === "PRESENT" ? 3 : 0;
        const score = polarityScore + severityScore(unit.attributes?.severity);
        return { span: unit.span, score, dateISO: unit.dateISO || "" };
      })
      .sort((a, b) => b.score - a.score || a.dateISO.localeCompare(b.dateISO));
  };

  /**
   * Attaches top evidence quotes to each narrative bullet.
   * @param {string} sectionKey
   * @param {string[]} bullets
   * @returns {Array<{ bullet: string, quotes: string[] }>}
   */
  const buildEvidenceBySection = (sectionKey, bullets) => {
    const ranked = rankEvidence(sectionKey);
    const used = new Set();
    let cursor = 0;
    return bullets.map((bullet) => {
      const quotes = [];
      while (cursor < ranked.length && quotes.length < 2) {
        const candidate = ranked[cursor];
        cursor += 1;
        if (!candidate.span || used.has(candidate.span)) continue;
        used.add(candidate.span);
        quotes.push(candidate.span);
      }
      return { bullet, quotes };
    });
  };

  /**
   * Provides fallback intensity lines when the model omits them.
   * @returns {string[]}
   */
  const buildIntensityFallback = () => ["Week 1 ..", "Week 4 ...", "Week 8 ...."];

  /**
   * Normalizes or backfills the over-time summary language.
   * @param {string} value
   * @returns {string}
   */
  const normalizeOverTimeSummary = (value) => {
    const summaryText = (value || "").trim();
    const lower = summaryText.toLowerCase();
    if (summaryText && (lower.includes("week") || lower.includes("month") || lower.includes("over time"))) {
      return summaryText;
    }
    return `Across ${timeRangeLabel.toLowerCase()}, these experiences shift from day to day. Some moments feel lighter, and others feel heavier, especially when stress or sleep changes.`;
  };

  const summary = {
    timeRangeLabel,
    rangeCoverage: snapshotDoc.snapshot?.rangeCoverage || null,
    confidenceNote: narrative.confidenceNote || "Based on patterns in written reflections",
    whySharing:
      narrative.whySharing && narrative.whySharing.trim().toLowerCase().startsWith("i ")
        ? narrative.whySharing
        : "I want to share these reflections to make it easier to explain what I've been experiencing and where I could use support.",
    recurringExperiences: narrative.recurringExperiences || [],
    overTimeSummary: normalizeOverTimeSummary(narrative.overTimeSummary),
    intensityLines: narrative.intensityLines?.length ? narrative.intensityLines : buildIntensityFallback(),
    impactAreas: narrative.impactAreas || [],
    impactNote: narrative.impactNote || "",
    relatedInfluences: narrative.relatedInfluences || [],
    unclearAreas: narrative.unclearAreas || [],
    questionsToExplore: narrative.questionsToExplore || [],
    highlights: narrative.highlights || [],
    shiftsOverTime: narrative.shiftsOverTime || [],
    contextImpactSummary: narrative.contextImpactSummary || "",
    evidenceBySection: {
      recurringExperiences: buildEvidenceBySection("recurringExperiences", narrative.recurringExperiences || []),
      impactAreas: buildEvidenceBySection("impactAreas", narrative.impactAreas || []),
      relatedInfluences: buildEvidenceBySection("relatedInfluences", narrative.relatedInfluences || []),
      unclearAreas: buildEvidenceBySection("unclearAreas", narrative.unclearAreas || []),
      questionsToExplore: buildEvidenceBySection("questionsToExplore", narrative.questionsToExplore || []),
    },
    topics: Array.from(topics),
  };

  res.json({ summary, appendix, stale });
});

module.exports = {
  analyzeEntry,
  prepareSummary,
  generateEntryEvidence,
  generateClinicalEvidenceUnits,
  generateClinicalEvidenceUnitsLegacy,
  generateClinicalEvidenceUnitsV2,
  generateWeeklySummary,
  generateLegacyEntryAnalysis,
};
