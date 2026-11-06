import { generateJSON } from "./gemini";
import { ASK_SYSTEM } from "./prompts";
import { REFERENCE_DATE } from "./leadLogic";
import { IntentSchema, type Intent } from "./askEngine";

// AI's only job: question -> validated intent. Invalid output becomes "unsupported", never an error path into the data.
export async function interpretQuestion(question: string): Promise<Intent> {
  const raw = await generateJSON({
    system: ASK_SYSTEM,
    prompt: `Reference date (today): ${REFERENCE_DATE}\nQuestion: ${JSON.stringify(question)}`,
    temperature: 0,
  });
  const parsed = IntentSchema.safeParse(raw);
  if (!parsed.success) {
    return { intent: "unsupported", reason: "Could not map the question to a supported query" };
  }
  return parsed.data;
}