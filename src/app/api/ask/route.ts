import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllLeads, enrichLeads } from "@/lib/leadService";
import { interpretQuestion } from "@/lib/askInterpreter";
import { runIntent } from "@/lib/askEngine";
import { AIError } from "@/lib/gemini";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ question: z.string().trim().min(2).max(300) });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please type a question (2–300 characters)." }, { status: 400 });
  }

  try {
    const { question } = parsed.data;
    const intent = await interpretQuestion(question); // AI: understand
    const { leads } = enrichLeads(await getAllLeads());
    const result = runIntent(intent, leads); // code: answer
    return NextResponse.json({ question, interpreted: intent, ...result });
  } catch (e) {
    if (e instanceof AIError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to answer the question" }, { status: 500 });
  }
}