// Executes a *validated intent* against real lead data. No AI in here:
// every number in an answer comes from this file, so it can be checked.
import { z } from "zod";
import { STAGE_ORDER, REFERENCE_DATE, type EnrichedLead } from "./leadLogic";

const stage = z.enum(STAGE_ORDER);
const issueType = z.enum([
  "missing_contact", "contradiction", "suspicious_email",
  "duplicate", "invalid_date_order", "stage_inconsistency",
]);

// The ONLY operations the assistant can perform. Anything else is "unsupported".
export const IntentSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("list_overdue") }),
  z.object({ intent: z.literal("stage_summary"), stage: stage.nullish() }),
  z.object({ intent: z.literal("list_by_stage"), stage }),
  z.object({ intent: z.literal("list_data_issues"), issueType: issueType.nullish() }),
  z.object({ intent: z.literal("list_duplicates") }),
  z.object({ intent: z.literal("waiting_for_payment") }),
  z.object({ intent: z.literal("upcoming_followups"), days: z.number().int().min(1).max(90).nullish() }),
  z.object({ intent: z.literal("find_lead"), query: z.string().trim().min(1).max(100) }),
  z.object({ intent: z.literal("unsupported"), reason: z.string().max(200).nullish() }),
]);
export type Intent = z.infer<typeof IntentSchema>;

export type AskRow = {
  leadId: string;
  company: string;
  stage: string;
  dealValueBDT: number;
  nextFollowUp: string | null;
  note: string | null;
};
export type AskResult = { answer: string; rows: AskRow[]; caveats: string[] };

const bdt = (n: number) => `BDT ${n.toLocaleString("en-US")}`;
const sum = (ls: EnrichedLead[]) => ls.reduce((s, l) => s + l.dealValueBDT, 0);
const isOpen = (l: EnrichedLead) => l.stage !== "Paid" && l.stage !== "Lost";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function toRow(l: EnrichedLead, note?: string | null): AskRow {
  return {
    leadId: l.leadId,
    company: l.company,
    stage: l.stage,
    dealValueBDT: l.dealValueBDT,
    nextFollowUp: l.nextFollowUp,
    note: note ?? l.recommendedAction ?? null,
  };
}

// If two leads in the result look like the same deal, a plain sum counts it twice.
function duplicateCaveat(set: EnrichedLead[]): string[] {
  const ids = new Set(set.map((l) => l.leadId));
  const repeats = set.filter((l) =>
    l.issues.some((i) => i.type === "duplicate" && i.relatedLeadId && ids.has(i.relatedLeadId) && l.leadId > i.relatedLeadId)
  );
  if (!repeats.length) return [];
  const adjusted = sum(set) - sum(repeats);
  return [
    `${repeats.map((r) => r.leadId).join(", ")} ${repeats.length === 1 ? "looks like a duplicate" : "look like duplicates"} of another lead in this list. ` +
      `Counting each deal once, the total would be ${bdt(adjusted)} across ${plural(set.length - repeats.length, "deal")}.`,
  ];
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function runIntent(intent: Intent, leads: EnrichedLead[]): AskResult {
  switch (intent.intent) {
    case "list_overdue": {
      const set = leads.filter((l) => l.isOverdue);
      const caveats = [
        ...leads
          .filter((l) => isOpen(l) && l.issues.some((i) => i.type === "invalid_date_order"))
          .map((l) => `${l.leadId} (${l.company}) is not listed: its follow-up date is before its last-contact date, so the dates need fixing first.`),
        ...duplicateCaveat(set),
      ];
      return {
        answer: `${plural(set.length, "lead")} overdue (follow-up date before ${REFERENCE_DATE}), worth ${bdt(sum(set))} in total: ${set.map((l) => l.leadId).join(", ") || "none"}.`,
        rows: set.map((l) => toRow(l)),
        caveats,
      };
    }

    case "stage_summary": {
      if (!intent.stage) {
        const rows = STAGE_ORDER.map((s) => {
          const inStage = leads.filter((l) => l.stage === s);
          return `${s}: ${inStage.length} (${bdt(sum(inStage))})`;
        });
        return { answer: `Pipeline by stage — ${rows.join("; ")}.`, rows: [], caveats: [] };
      }
      const set = leads.filter((l) => l.stage === intent.stage);
      return {
        answer: `${intent.stage} stage: ${plural(set.length, "lead")}, total value ${bdt(sum(set))}.`,
        rows: set.map((l) => toRow(l)),
        caveats: duplicateCaveat(set),
      };
    }

    case "list_by_stage": {
      const set = leads.filter((l) => l.stage === intent.stage);
      return {
        answer: `${plural(set.length, "lead")} in ${intent.stage}, total ${bdt(sum(set))}.`,
        rows: set.map((l) => toRow(l)),
        caveats: duplicateCaveat(set),
      };
    }

    case "list_data_issues": {
      const set = leads.filter((l) =>
        intent.issueType ? l.issues.some((i) => i.type === intent.issueType) : l.issues.length > 0
      );
      return {
        answer: `${plural(set.length, "lead")} ${intent.issueType ? `with "${intent.issueType.replace(/_/g, " ")}" issues` : "with data-quality issues"}: ${set.map((l) => l.leadId).join(", ") || "none"}.`,
        rows: set.map((l) =>
          toRow(l, l.issues.filter((i) => !intent.issueType || i.type === intent.issueType).map((i) => i.message).join(" • "))
        ),
        caveats: [],
      };
    }

    case "list_duplicates": {
      const pairs = new Map<string, string>();
      const involved = new Set<string>();
      for (const l of leads) {
        for (const i of l.issues) {
          if (i.type !== "duplicate" || !i.relatedLeadId) continue;
          const [a, b] = [l.leadId, i.relatedLeadId].sort();
          pairs.set(`${a}/${b}`, i.message.startsWith("Exact") ? "exact" : "probable");
          involved.add(l.leadId);
        }
      }
      const text = [...pairs].map(([k, kind]) => `${k} (${kind})`).join(", ");
      return {
        answer: pairs.size ? `${plural(pairs.size, "duplicate pair")}: ${text}.` : "No duplicate leads found.",
        rows: leads.filter((l) => involved.has(l.leadId)).map((l) => toRow(l, l.issues.find((i) => i.type === "duplicate")?.message)),
        caveats: ["Duplicates are flagged, not deleted. Review them before merging."],
      };
    }

    case "waiting_for_payment": {
      const set = leads.filter((l) => l.stage === "Invoice sent");
      return {
        answer: `${plural(set.length, "lead")} with an invoice sent and payment pending, total ${bdt(sum(set))}.`,
        rows: set.map((l) => toRow(l)),
        caveats: duplicateCaveat(set),
      };
    }

    case "upcoming_followups": {
      const days = intent.days ?? 7;
      const end = addDays(REFERENCE_DATE, days);
      const set = leads
        .filter((l) => isOpen(l) && l.nextFollowUp && l.nextFollowUp >= REFERENCE_DATE && l.nextFollowUp <= end && !l.issues.some((i) => i.type === "invalid_date_order"))
        .sort((a, b) => a.nextFollowUp!.localeCompare(b.nextFollowUp!));
      return {
        answer: `${plural(set.length, "follow-up")} due from ${REFERENCE_DATE} to ${end}.`,
        rows: set.map((l) => toRow(l)),
        caveats: [],
      };
    }

    case "find_lead": {
      const q = intent.query.toLowerCase();
      const set = leads
        .filter((l) => `${l.company} ${l.contact.name ?? ""}`.toLowerCase().includes(q))
        .slice(0, 5);
      return {
        answer: set.length
          ? set.map((l) => `${l.leadId} ${l.company}: ${l.stage}, ${bdt(l.dealValueBDT)}, next follow-up ${l.nextFollowUp ?? "not set"}`).join(" | ")
          : `No lead matches "${intent.query}".`,
        rows: set.map((l) => toRow(l, l.notes)),
        caveats: [],
      };
    }

    case "unsupported":
    default:
      return {
        answer:
          "I can answer questions about pipeline stages and totals, overdue follow-ups, upcoming follow-ups, invoices waiting for payment, data-quality issues, duplicates, or a specific company. Try: \"Which deals are overdue?\" or \"What is the total value in Proposal stage?\"",
        rows: [],
        caveats: [],
      };
  }
}