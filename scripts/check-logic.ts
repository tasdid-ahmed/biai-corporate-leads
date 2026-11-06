import mongoose from "mongoose";
import { connectDB } from "../src/lib/mongodb";
import { Lead } from "../src/models/Lead";
import { analyze, totalsByStage, recommendedAction, type LeadLike } from "../src/lib/leadLogic";

const ok = (name: string, cond: boolean) => console.log(cond ? "PASS" : "FAIL", "-", name);

async function main() {
  await connectDB();
  const leads = (await Lead.find().sort({ leadId: 1 }).lean()) as unknown as LeadLike[];
  const r = analyze(leads);
  const get = (id: string) => leads.find((l) => l.leadId === id)!;
  const types = (id: string) => r.issuesByLead[id].map((i) => i.type);
  const msgs = (id: string) => r.issuesByLead[id].map((i) => i.message).join(" ");
  const pair = (a: string, b: string, kind: string) =>
    r.duplicates.some((d) => d.a === a && d.b === b && d.kind === kind);

  ok("25 leads loaded", leads.length === 25);
  ok("8 valid overdue (L04,L06,L10,L13,L15,L19,L20,L22)",
    r.overdueIds.join(",") === "L04,L06,L10,L13,L15,L19,L20,L22");
  ok("L09 not overdue", !r.overdueIds.includes("L09"));
  ok("L25 flagged invalid date AND not counted overdue",
    types("L25").includes("invalid_date_order") && !r.overdueIds.includes("L25"));
  ok("L01/L23 exact duplicate", pair("L01", "L23", "exact"));
  ok("L02/L03 probable duplicate", pair("L02", "L03", "probable"));
  ok("L17 NOT a duplicate", r.duplicates.every((d) => d.a !== "L17" && d.b !== "L17"));
  ok("L06 missing phone + contradiction",
    msgs("L06").includes("phone is missing") && types("L06").includes("contradiction"));
  ok("L06 email NOT reported missing", !msgs("L06").includes("email is missing"));
  ok("L12 Paid-stage inconsistency", types("L12").includes("stage_inconsistency"));
  ok("L18 suspicious email", types("L18").includes("suspicious_email"));
  ok("L22 overdue + check-bank advice",
    r.overdueIds.includes("L22") && (recommendedAction(get("L22")) ?? "").includes("bank"));
  ok("L24 missing name + email",
    msgs("L24").includes("name is missing") && msgs("L24").includes("email is missing"));
  const proposal = totalsByStage(leads).find((t) => t.stage === "Proposal")!;
  ok("Proposal total = 1,620,000", proposal.totalValueBDT === 1620000);

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });