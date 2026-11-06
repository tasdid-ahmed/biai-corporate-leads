import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllLeads, enrichLeads } from "@/lib/leadService";
import { generateJSON, AIError } from "@/lib/gemini";
import { EMAIL_SYSTEM } from "@/lib/prompts";
import { REFERENCE_DATE } from "@/lib/leadLogic";

export const dynamic = "force-dynamic";

const EmailSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(3000),
});

type Ctx = { params: Promise<{ leadId: string }> };

// Drafts only. Nothing is ever sent from here.
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { leadId } = await ctx.params;
    const { leads } = enrichLeads(await getAllLeads());
    const lead = leads.find((l) => l.leadId === leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const force = req.nextUrl.searchParams.get("force") === "true";
    if (!force && lead.recommendedAction?.startsWith("Do not contact")) {
      return NextResponse.json(
        { error: "The notes say not to contact this lead, so no email was drafted.", canForce: true },
        { status: 409 }
      );
    }

    const facts = {
      today: REFERENCE_DATE,
      company: lead.company,
      contactName: lead.contact.name,
      contactRole: lead.contact.role,
      industry: lead.industry,
      stage: lead.stage,
      dealValue: lead.dealValueBDT > 0 ? `BDT ${lead.dealValueBDT.toLocaleString("en-US")}` : null,
      lastContact: lead.lastContact,
      nextFollowUp: lead.nextFollowUp,
      notes: lead.notes,
    };

    const raw = await generateJSON({
      system: EMAIL_SYSTEM,
      prompt: `LEAD DATA:\n${JSON.stringify(facts, null, 2)}\n\nWrite the follow-up email.`,
      temperature: 0.4,
    });
    const email = EmailSchema.safeParse(raw);
    if (!email.success) {
      return NextResponse.json({ error: "The AI returned an unexpected format. Please try again." }, { status: 502 });
    }

    // Warnings come from our own rules, not from the AI.
    const warnings = [...lead.issues.map((i) => i.message), lead.recommendedAction].filter(Boolean);

    return NextResponse.json({
      to: lead.contact.email,
      subject: email.data.subject,
      body: email.data.body,
      warnings,
    });
  } catch (e) {
    if (e instanceof AIError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to draft the email" }, { status: 500 });
  }
}