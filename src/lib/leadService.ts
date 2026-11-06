import { connectDB } from "./mongodb";
import { Lead } from "../models/Lead";
import { analyze, recommendedAction, type LeadLike } from "./leadLogic";

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