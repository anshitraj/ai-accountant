import { financeSystemPrompt } from "../prompts/financeSystemPrompt";
import type { AIProviderConfig } from "../types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

export function geminiConfig(model?: string): AIProviderConfig {
  return {
    provider: "gemini",
    model: model || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    temperature: Number(process.env.GEMINI_TEMPERATURE ?? 0),
    maxTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 4096),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30_000),
  };
}

export async function callGeminiProvider(prompt: string, config: AIProviderConfig): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GENAI_API_KEY;
  if (!apiKey) throw new Error("gemini_missing_api_key");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: financeSystemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          responseMimeType: "application/json",
        },
      }),
    });

    const payload = await response.json() as GeminiResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message || `gemini_http_${response.status}`);
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("gemini_empty_response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
