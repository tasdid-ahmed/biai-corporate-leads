import { NextResponse } from "next/server";
import { getAllLeads, enrichLeads } from "@/lib/leadService";
import { REFERENCE_DATE, totalsByStage } from "@/lib/leadLogic";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getAllLeads();
    const { leads, duplicates } = enrichLeads(raw);

    const issueCounts: Record<string, number> = {};
    for (const l of leads) for (const i of l.issues) issueCounts[i.type] = (issueCounts[i.type] ?? 0) + 1;

    const upcoming = leads
      .filter((l) => !["Paid", "Lost"].includes(l.stage) && l.nextFollowUp && l.nextFollowUp >= REFERENCE_DATE)
      .sort((a, b) => a.nextFollowUp!.localeCompare(b.nextFollowUp!))
      .slice(0, 5)
      .map((l) => ({ leadId: l.leadId, company: l.company, stage: l.stage, nextFollowUp: l.nextFollowUp }));

    return NextResponse.json({
      referenceDate: REFERENCE_DATE,
      totalLeads: leads.length,
      totalDealValueBDT: raw.reduce((s, l) => s + l.dealValueBDT, 0),
      overdueCount: leads.filter((l) => l.isOverdue).length,
      overdueIds: leads.filter((l) => l.isOverdue).map((l) => l.leadId),
      leadsWithIssues: leads.filter((l) => l.issues.length > 0).length,
      issueCounts,
      duplicates,
      stageTotals: totalsByStage(raw),
      upcoming,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}