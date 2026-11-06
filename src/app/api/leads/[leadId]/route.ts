import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Lead, STAGES } from "@/models/Lead";
import { getAllLeads, enrichLeads } from "@/lib/leadService";

export const dynamic = "force-dynamic";

// "" or null clears a field; dates must look like YYYY-MM-DD.
const text = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().max(500).nullable()
);
const dateOnly = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Use YYYY-MM-DD").nullable()
);

const PatchSchema = z
  .object({
    company: z.string().trim().min(1).max(200),
    industry: text,
    source: text,
    contact: z
      .object({ name: text, role: text, email: text, phone: text })
      .partial(),
    stage: z.enum(STAGES),
    dealValueBDT: z.number().min(0),
    lastContact: dateOnly,
    nextFollowUp: dateOnly,
    notes: z.string().max(5000),
  })
  .partial()
  .strict(); // unknown fields are rejected, not silently saved

async function loadEnriched(leadId: string) {
  const { leads } = enrichLeads(await getAllLeads());
  return leads.find((l) => l.leadId === leadId) ?? null;
}

type Ctx = { params: Promise<{ leadId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { leadId } = await ctx.params;
    const lead = await loadEnriched(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { leadId } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: z.flattenError(parsed.error) },
        { status: 400 }
      );
    }

    // Dot-notation so editing one contact field doesn't wipe the others.
    const { contact, ...rest } = parsed.data;
    const set: Record<string, unknown> = { ...rest };
    if (contact) {
      for (const [k, v] of Object.entries(contact)) {
        if (v !== undefined) set[`contact.${k}`] = v;
      }
    }
    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await connectDB();
    const updated = await Lead.findOneAndUpdate(
      { leadId },
      { $set: set },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    // Return the lead with fresh computed flags (overdue, issues) after the edit.
    return NextResponse.json({ ok: true, lead: await loadEnriched(leadId) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}