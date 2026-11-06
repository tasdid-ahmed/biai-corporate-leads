import { GoogleGenAI } from "@google/genai";

export class AIError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIError("GEMINI_API_KEY is not set on the server", 500);
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

// Asks Gemini for JSON. Callers must still validate the result (Zod) before trusting it.
export async function generateJSON(opts: {
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<unknown> {
  const model = process.env.GEMINI_MODEL;
  if (!model) throw new AIError("GEMINI_MODEL is not set on the server", 500);
  const ai = getClient();

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.2,
          responseMimeType: "application/json",
        },
      });
      const text = (res.text ?? "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      return JSON.parse(text);
    } catch (e) {
      lastError = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); // one quick retry
    }
  }
  console.error("Gemini call failed:", lastError instanceof Error ? lastError.message : lastError);
  throw new AIError("The AI service is unavailable or rate-limited. Please try again in a moment.");
}