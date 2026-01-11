export interface LlmEmotion {
  label: string;
  intensity: number;
  tone: "positive" | "neutral" | "negative";
}

export interface LlmAnalysis {
  emotions: LlmEmotion[];
  tags: string[];
  triggers: string[];
  summary?: string;
}

const defaultBaseUrl = "https://api.openai.com/v1";

export const analyzeEntryText = async (text: string): Promise<LlmAnalysis> => {
  const apiKey = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? "";
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) ?? defaultBaseUrl;
  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? "gpt-4o-mini";

  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
  if (!apiKey && !isLocal) {
    throw new Error("Missing VITE_OPENAI_API_KEY");
  }

  const prompt = [
    "You are a therapist assistant that extracts structured data from a journal entry.",
    "Return strict JSON with keys: emotions (array of {label, intensity 0-100, tone: positive|neutral|negative}), tags (array of short topics/themes), triggers (array of short phrases), summary (1-2 sentences).",
    "Keep it concise and avoid long text. Use lower-case for tags/triggers.",
  ].join(" ");

  const body = {
    model,
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Journal entry:\n${text}\nReturn JSON only.`,
      },
    ],
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: "json_object" },
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey || "sk-local"}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No analysis returned");
  }

  let parsed: LlmAnalysis;
  try {
    parsed = JSON.parse(content) as LlmAnalysis;
  } catch {
    throw new Error("Failed to parse analysis JSON");
  }

  return {
    emotions: parsed.emotions || [],
    tags: parsed.tags || [],
    triggers: parsed.triggers || [],
    summary: parsed.summary,
  };
};
