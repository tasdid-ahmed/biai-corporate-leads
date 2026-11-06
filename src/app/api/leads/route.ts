import { NextRequest, NextResponse } from "next/server";
import { getAllLeads, enrichLeads, filterLeads } from "@/lib/leadService";
import { REFERENCE_DATE } from "@/lib/leadLogic";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const { leads, duplicates } = enrichLeads(await getAllLeads());

    const filtered = filterLeads(leads, {
      q: sp.get("q") ?? undefined,
      stage: sp.get("stage") ?? undefined,
      industry: sp.get("industry") ?? undefined,
      overdue: sp.get("overdue") === "true",
      issues: sp.get("issues") === "true",
    });

    return NextResponse.json({
      referenceDate: REFERENCE_DATE,
      count: filtered.length,
      total: leads.length,
      duplicates,
      leads: filtered,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 });
  }
}