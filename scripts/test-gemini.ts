import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing in .env");
  const ai = new GoogleGenAI({ apiKey });

  if (process.argv.includes("--models")) {
    const pager = await ai.models.list();
    for await (const m of pager) {
      if (m.name?.includes("flash")) console.log(m.name);
    }
    return;
  }

  const model = process.env.GEMINI_MODEL;
  if (!model) throw new Error("Set GEMINI_MODEL in .env (run with --models to see options)");
  const res = await ai.models.generateContent({
    model,
    contents: "Reply with exactly: Gemini connection OK",
  });
  console.log(res.text);
}

main().catch((e) => {
  console.error("Gemini test failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});