import { connectDB } from "./mongodb";
import { Lead } from "../models/Lead";
import { analyze, recommendedAction, totalsByStage, REFERENCE_DATE, type LeadLike } from "./leadLogic";

export async function getAllLeads(): Promise<LeadLike[]> {
  await connectDB();
  const docs = await Lead.find().sort({ leadId: 1 }).lean();
  return docs.map((d) => ({
    leadId: d.leadId,
    company: d.company,
    industry: d.industry ?? null,
    source: d.source ?? null,
    contact: {
      name: d.contact?.name ?? null,
      role: d.contact?.role ?? null,
      email: d.contact?.email ?? null,
      phone: d.contact?.phone ?? null,
    },
    stage: d.stage,
    dealValueBDT: d.dealValueBDT ?? 0,
    lastContact: d.lastContact ?? null,
    nextFollowUp: d.nextFollowUp ?? null,
    notes: d.notes ?? "",
  }));
}

// Adds computed fields (never stored, so they can't go stale).
export function enrichLeads(leads: LeadLike[]) {
  const { duplicates, issuesByLead, overdueIds } = analyze(leads);
  const overdue = new Set(overdueIds);
  return {
    duplicates,
    leads: leads.map((l) => ({
      ...l,
      isOverdue: overdue.has(l.leadId),
      issues: issuesByLead[l.leadId],
      recommendedAction: recommendedAction(l),
    })),
  };
}

// Shared by the dashboard page and /api/dashboard so both always agree.
export async function getDashboardData() {
  const raw = await getAllLeads();
  const { leads, duplicates } = enrichLeads(raw);

  const issueCounts: Record<string, number> = {};
  for (const l of leads) for (const i of l.issues) issueCounts[i.type] = (issueCounts[i.type] ?? 0) + 1;

  const overdue = leads
    .filter((l) => l.isOverdue)
    .sort((a, b) => a.nextFollowUp!.localeCompare(b.nextFollowUp!))
    .map((l) => ({
      leadId: l.leadId,
      company: l.company,
      stage: l.stage,
      dealValueBDT: l.dealValueBDT,
      nextFollowUp: l.nextFollowUp,
      advice: l.recommendedAction,
    }));

  const upcoming = leads
    .filter((l) => !["Paid", "Lost"].includes(l.stage) && l.nextFollowUp && l.nextFollowUp >= REFERENCE_DATE)
    .sort((a, b) => a.nextFollowUp!.localeCompare(b.nextFollowUp!))
    .slice(0, 6)
    .map((l) => ({ leadId: l.leadId, company: l.company, stage: l.stage, nextFollowUp: l.nextFollowUp }));

  return {
    referenceDate: REFERENCE_DATE,
    totalLeads: leads.length,
    totalDealValueBDT: raw.reduce((s, l) => s + l.dealValueBDT, 0),
    overdueCount: overdue.length,
    overdueIds: overdue.map((o) => o.leadId),
    overdue,
    leadsWithIssues: leads.filter((l) => l.issues.length > 0).length,
    issueCounts,
    duplicates,
    stageTotals: totalsByStage(raw),
    upcoming,
  };
}

export type EnrichedRow = ReturnType<typeof enrichLeads>["leads"][number];

export type LeadFilters = {
  q?: string;
  stage?: string;
  industry?: string;
  overdue?: boolean;
  issues?: boolean;
};

// One filter used by both the Leads page and /api/leads.
export function filterLeads(leads: EnrichedRow[], f: LeadFilters): EnrichedRow[] {
  const q = f.q?.trim().toLowerCase();
  return leads.filter((l) => {
    if (f.stage && l.stage !== f.stage) return false;
    if (f.industry && l.industry !== f.industry) return false;
    if (f.overdue && !l.isOverdue) return false;
    if (f.issues && l.issues.length === 0) return false;
    if (q) {
      const hay = `${l.leadId} ${l.company} ${l.contact.name ?? ""} ${l.contact.email ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}