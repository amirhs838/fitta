export type AiProvider = "openai" | "anthropic" | "gemini";

export type AiMealItem = {
  name: string;
  quantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const SYSTEM_PROMPT = `You estimate nutrition from food photos. Return ONLY valid JSON matching this exact shape: {"items":[{"name":"string","quantity":"string","calories":number,"proteinG":number,"carbsG":number,"fatG":number}]}. Identify visible foods conservatively. Estimate portions and values; use 0 only when a macro cannot be estimated. Never provide medical diagnoses, health claims, commentary, markdown, or prose outside JSON.`;

function getConfig() {
  const provider = process.env.AI_PROVIDER as AiProvider | undefined;
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL;

  if (!provider || !["openai", "anthropic", "gemini"].includes(provider) || !apiKey) {
    throw new Error("AI_PROVIDER and AI_PROVIDER_API_KEY must be configured.");
  }

  return { provider, apiKey, model };
}

function buildUserPrompt(description: string) {
  return description
    ? `The user added this context: ${description}\nUse it only to improve the estimate. Analyse the attached meal photo.`
    : "Analyse the attached meal photo.";
}

function getTextFromJson(rawText: string) {
  const withoutFence = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(withoutFence) as { items?: unknown };
  if (!Array.isArray(parsed.items)) throw new Error("AI response did not contain items.");
  return parsed.items;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100_000 ? value : null;
}

function parseItems(rawItems: unknown[]): AiMealItem[] {
  const items = rawItems.slice(0, 12).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 120) : "";
    const quantity = typeof item.quantity === "string" ? item.quantity.trim().slice(0, 80) : "";
    const calories = numberValue(item.calories);
    const proteinG = numberValue(item.proteinG);
    const carbsG = numberValue(item.carbsG);
    const fatG = numberValue(item.fatG);
    if (!name || calories === null || proteinG === null || carbsG === null || fatG === null) return [];
    return [{ name, quantity, calories, proteinG, carbsG, fatG }];
  });

  if (!items.length) throw new Error("No valid food items returned by AI.");
  return items;
}

async function responseText(response: Response) {
  if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}.`);
  return response.json() as Promise<unknown>;
}

export async function estimateMealFromImage({ imageBase64, mimeType, description }: { imageBase64: string; mimeType: string; description: string }) {
  const { provider, apiKey, model } = getConfig();
  const prompt = buildUserPrompt(description);
  let output = "";

  if (provider === "openai") {
    const result = await responseText(await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model ?? "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "low" } }] },
        ],
      }),
    })) as { choices?: Array<{ message?: { content?: string } }> };
    output = result.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const result = await responseText(await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model ?? "claude-3-5-haiku-latest",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } }, { type: "text", text: prompt }] }],
      }),
    })) as { content?: Array<{ type?: string; text?: string }> };
    output = result.content?.find((part) => part.type === "text")?.text ?? "";
  }

  if (provider === "gemini") {
    const selectedModel = model ?? "gemini-2.0-flash";
    const result = await responseText(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: imageBase64 } }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1200 },
      }),
    })) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    output = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  }

  return parseItems(getTextFromJson(output));
}
