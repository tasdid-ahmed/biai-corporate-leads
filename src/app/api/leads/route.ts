import { NextRequest, NextResponse } from "next/server";
import { getAllLeads, enrichLeads } from "@/lib/leadService";
import { REFERENCE_DATE } from "@/lib/leadLogic";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim().toLowerCase();
    const stage = sp.get("stage");
    const industry = sp.get("industry");
    const overdueOnly = sp.get("overdue") === "true";
    const issuesOnly = sp.get("issues") === "true";

    const { leads, duplicates } = enrichLeads(await getAllLeads());

    const filtered = leads.filter((l) => {
      if (stage && l.stage !== stage) return false;
      if (industry && l.industry !== industry) return false;
      if (overdueOnly && !l.isOverdue) return false;
      if (issuesOnly && l.issues.length === 0) return false;
      if (q) {
        const hay = `${l.company} ${l.contact.name ?? ""} ${l.contact.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
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