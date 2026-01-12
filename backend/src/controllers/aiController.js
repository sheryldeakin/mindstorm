const asyncHandler = require("../utils/asyncHandler");

const buildPrompt = () =>
  [
    "You are a therapist assistant that extracts structured data from a journal entry.",
    "Return strict JSON with keys: title (short 3-6 word title), emotions (array of {label, intensity 0-100, tone: positive|neutral|negative}), themes (array of short themes, 1-3 words), triggers (array of short phrases), summary (1-2 sentences).",
    "Keep it concise and avoid long text. Use lower-case for themes/triggers. Title should be in title case.",
  ].join(" ");

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

  const parsed = extractJson(content);
  if (!parsed) {
    return res.status(502).json({ message: "Failed to parse analysis JSON." });
  }

  res.json({
    analysis: {
      title: parsed.title,
      emotions: parsed.emotions || [],
      themes: parsed.themes || [],
      triggers: parsed.triggers || [],
      summary: parsed.summary,
    },
  });
});

module.exports = { analyzeEntry };
