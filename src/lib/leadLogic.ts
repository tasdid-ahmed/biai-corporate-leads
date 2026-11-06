// Deterministic business rules for BIAI Sales Intelligence.
// No AI, no DB access here: pure functions, so results are testable and explainable.

export const REFERENCE_DATE = "2026-11-01"; // assessment "today"; overdue = strictly before this

export const STAGE_ORDER = [
  "New", "Contacted", "Meeting", "Proposal", "Invoice sent", "Paid", "Lost",
] as const;

export type LeadLike = {
  leadId: string;
  company: string;
  industry?: string | null;
    source?: string | null;
  contact: {
    name?: string | null;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  stage: string;
  dealValueBDT: number;
  lastContact: string | null; // "YYYY-MM-DD"
  nextFollowUp: string | null; // "YYYY-MM-DD"
  notes: string;
};

export type IssueType =
  | "missing_contact"
  | "contradiction"
  | "suspicious_email"
  | "duplicate"
  | "invalid_date_order"
  | "stage_inconsistency";

export type Issue = {
  type: IssueType;
  severity: "high" | "medium" | "low";
  message: string;
  relatedLeadId?: string;
};

const isTerminal = (stage: string) => stage === "Paid" || stage === "Lost";
const has = (v?: string | null) => !!v && v.trim() !== "";

// ---------- Dates ----------
// Dates are "YYYY-MM-DD" strings, so plain string comparison is correct and timezone-proof.

export function hasInvalidDateOrder(l: LeadLike): boolean {
  return !!l.lastContact && !!l.nextFollowUp && l.nextFollowUp < l.lastContact;
}

export function isOverdue(l: LeadLike, ref: string = REFERENCE_DATE): boolean {
  if (isTerminal(l.stage)) return false; // Paid/Lost need no chasing
  if (!l.nextFollowUp) return false;
  if (hasInvalidDateOrder(l)) return false; // bad data is flagged separately, not counted as overdue
  return l.nextFollowUp < ref; // a follow-up dated exactly on ref is NOT overdue
}

// ---------- Totals ----------

export function totalsByStage(leads: LeadLike[]) {
  return STAGE_ORDER.map((stage) => {
    const inStage = leads.filter((l) => l.stage === stage);
    return {
      stage,
      count: inStage.length,
      totalValueBDT: inStage.reduce((s, l) => s + l.dealValueBDT, 0),
    };
  });
}

// ---------- Duplicates ----------

const normCompany = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["ltd", "limited", "co", "company", "inc"].includes(w))
    .join(" ");

const normEmail = (e?: string | null) => (has(e) ? e!.trim().toLowerCase() : null);
const normPhone = (p?: string | null) => (has(p) ? p!.replace(/\D/g, "") : null);

export type DuplicatePair = {
  a: string; // canonical (lower id)
  b: string; // the repeat
  kind: "exact" | "probable";
  reason: string;
};

export function findDuplicates(leads: LeadLike[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const x = leads[i], y = leads[j];
      const sameCompany = normCompany(x.company) === normCompany(y.company);
      const e1 = normEmail(x.contact.email), e2 = normEmail(y.contact.email);
      const p1 = normPhone(x.contact.phone), p2 = normPhone(y.contact.phone);
      const sameEmail = !!e1 && e1 === e2;
      const samePhone = !!p1 && p1 === p2;
      if (!(sameEmail || samePhone)) continue; // contact overlap is required, so "Megna" vs "Meghna" is NOT merged

      const [a, b] = x.leadId < y.leadId ? [x, y] : [y, x];
      if (sameCompany) {
        pairs.push({ a: a.leadId, b: b.leadId, kind: "exact", reason: "Same company and same contact entered twice" });
      } else {
        pairs.push({
          a: a.leadId, b: b.leadId, kind: "probable",
          reason: `Same contact (${sameEmail ? "email" : "phone"}) under different company names: "${a.company}" / "${b.company}"`,
        });
      }
    }
  }
  return pairs;
}

// ---------- Per-lead issues ----------

function emailLooksSuspicious(email: string): string | null {
  const e = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Email format is invalid";
  const domain = e.split("@")[1];
  if (/[A-Z]/.test(domain)) return `Email domain "${domain}" has unexpected capital letters (likely a typo)`;
  return null;
}

export function getIssues(l: LeadLike, dupes: DuplicatePair[]): Issue[] {
  const issues: Issue[] = [];
  const notes = l.notes ?? "";

  // 1. Missing contact details
  if (!has(l.contact.name)) issues.push({ type: "missing_contact", severity: "medium", message: "Contact name is missing" });
  if (!has(l.contact.email)) issues.push({ type: "missing_contact", severity: "medium", message: "Contact email is missing" });
  if (!has(l.contact.phone)) issues.push({ type: "missing_contact", severity: "medium", message: "Contact phone is missing" });

  // 2. Notes contradict the fields (e.g. notes say "no email" but an email exists)
  if (/\bno\b[^.]*\bemail\b/i.test(notes) && has(l.contact.email))
    issues.push({ type: "contradiction", severity: "medium", message: "Notes say there is no email, but an email is on file" });
  if (/\bno\b[^.]*\bphone\b/i.test(notes) && has(l.contact.phone))
    issues.push({ type: "contradiction", severity: "medium", message: "Notes say there is no phone, but a phone is on file" });

  // 3. Suspicious email
  if (has(l.contact.email)) {
    const why = emailLooksSuspicious(l.contact.email!);
    if (why) issues.push({ type: "suspicious_email", severity: "high", message: why });
  }

  // 4. Dates in the wrong order
  if (hasInvalidDateOrder(l))
    issues.push({
      type: "invalid_date_order", severity: "high",
      message: `Next follow-up (${l.nextFollowUp}) is before last contact (${l.lastContact})`,
    });

  // 5. Stage / payment inconsistencies
  if (l.stage === "Paid" && /advance|partial|second payment|balance|\b50\b/i.test(notes))
    issues.push({ type: "stage_inconsistency", severity: "high", message: "Marked Paid, but notes show only partial payment (second payment still due)" });
  if (l.stage === "New" && has(l.lastContact))
    issues.push({ type: "stage_inconsistency", severity: "low", message: "Stage is New (no contact yet) but a last-contact date is recorded" });

  // 6. Duplicates
  for (const d of dupes) {
    if (d.a === l.leadId || d.b === l.leadId) {
      const other = d.a === l.leadId ? d.b : d.a;
      issues.push({
        type: "duplicate", severity: d.kind === "exact" ? "high" : "medium",
        message: `${d.kind === "exact" ? "Exact duplicate" : "Probable duplicate"} of ${other}. ${d.reason}`,
        relatedLeadId: other,
      });
    }
  }
  return issues;
}

// Overdue is a status; this is the *advice* (kept separate in the UI).
export function recommendedAction(l: LeadLike): string | null {
  const n = l.notes ?? "";
  if (/do not contact/i.test(n)) return "Do not contact (per notes)";
  if (l.stage === "Invoice sent" && /check bank|paid\?/i.test(n)) return "Check bank/payment status before chasing the client";
  if (has(l.contact.email) && emailLooksSuspicious(l.contact.email!)) return "Verify the email address before sending anything";
  if (l.stage === "Paid" && /advance|second payment/i.test(n)) return "Confirm the second payment before treating this as fully paid";
  return null;
}

// ---------- One call for the whole dataset ----------

export function analyze(leads: LeadLike[], ref: string = REFERENCE_DATE) {
  const duplicates = findDuplicates(leads);
  const issuesByLead: Record<string, Issue[]> = {};
  for (const l of leads) issuesByLead[l.leadId] = getIssues(l, duplicates);
  const overdueIds = leads.filter((l) => isOverdue(l, ref)).map((l) => l.leadId);
  return { duplicates, issuesByLead, overdueIds };
}