import type { AiProvider } from "./meal-vision";

export type BodyAnalysis = {
  observations: string[];
  focusAreas: string[];
  trainingSuggestions: string[];
  nutritionSuggestions: string[];
  disclaimer: "این یک برآورد تصویری است، نه اندازه‌گیری پزشکی دقیق.";
};

const DISCLAIMER = "این یک برآورد تصویری است، نه اندازه‌گیری پزشکی دقیق." as const;
const SYSTEM_PROMPT = `You provide a cautious, non-medical wellness observation from a consenting adult's body-progress photo. Return ONLY valid JSON: {"observations":["string"],"focusAreas":["string"],"trainingSuggestions":["string"],"nutritionSuggestions":["string"]}. Observations must be qualitative and respectful, e.g. relative prominence of a general region. Never estimate body-fat percentage, weight, age, BMI, health condition, attractiveness, or diagnose anything. Do not shame the person. Provide no more than 3 items in each array. Training suggestions must be general cardio plus strength guidance. Nutrition suggestions must be general habits, not medical advice.`;

function getConfig() {
  const provider = process.env.AI_PROVIDER as AiProvider | undefined;
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL;
  if (!provider || !["openai", "anthropic", "gemini"].includes(provider) || !apiKey) throw new Error("AI provider is not configured.");
  return { provider, apiKey, model };
}

async function responseJson(response: Response) {
  if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}.`);
  return response.json() as Promise<unknown>;
}

function strings(value: unknown, max = 3) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 280)).slice(0, max) : [];
}

function parseAnalysis(text: string): BodyAnalysis {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const observations = strings(parsed.observations);
  const focusAreas = strings(parsed.focusAreas);
  const trainingSuggestions = strings(parsed.trainingSuggestions);
  const nutritionSuggestions = strings(parsed.nutritionSuggestions);
  if (!observations.length && !focusAreas.length) throw new Error("AI response is incomplete.");
  return { observations, focusAreas, trainingSuggestions, nutritionSuggestions, disclaimer: DISCLAIMER };
}

export async function analyzeBodyImage({ imageBase64, mimeType }: { imageBase64: string; mimeType: string }) {
  const { provider, apiKey, model } = getConfig();
  const prompt = "Analyse this consenting adult's progress photo cautiously and return the requested JSON.";
  let output = "";

  if (provider === "openai") {
    const result = await responseJson(await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: model ?? "gpt-4o-mini", response_format: { type: "json_object" }, max_tokens: 1000, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" } }] }] }) })) as { choices?: Array<{ message?: { content?: string } }> };
    output = result.choices?.[0]?.message?.content ?? "";
  }
  if (provider === "anthropic") {
    const result = await responseJson(await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: model ?? "claude-3-5-haiku-latest", max_tokens: 1000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } }, { type: "text", text: prompt }] }] }) })) as { content?: Array<{ type?: string; text?: string }> };
    output = result.content?.find((part) => part.type === "text")?.text ?? "";
  }
  if (provider === "gemini") {
    const selectedModel = model ?? "gemini-2.0-flash";
    const result = await responseJson(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }], generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1000 } }) })) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    output = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  }

  return parseAnalysis(output);
}
