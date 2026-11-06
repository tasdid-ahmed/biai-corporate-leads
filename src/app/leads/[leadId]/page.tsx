import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllLeads, enrichLeads } from "@/lib/leadService";
import { formatBDT, formatDate } from "@/lib/format";
import StageBadge from "@/components/StageBadge";
import LeadEditForm from "@/components/LeadEditForm";
import EmailDraft from "@/components/EmailDraft";

export const dynamic = "force-dynamic";

const SEVERITY: Record<string, string> = {
  high: "border-rose-200 bg-rose-50 text-rose-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-50 text-slate-700",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const { leads } = enrichLeads(await getAllLeads());
  const lead = leads.find((l) => l.leadId === leadId);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-indigo-600 hover:underline">
          ← All leads
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{lead.company}</h1>
          <StageBadge stage={lead.stage} />
          {lead.isOverdue && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Overdue</span>
          )}
        </div>
        <p className="text-sm text-slate-500">
          {lead.leadId} · {lead.industry ?? "No industry"} · Source: {lead.source ?? "unknown"}
        </p>
      </div>

      {(lead.issues.length > 0 || lead.recommendedAction) && (
        <section className="space-y-2">
          {lead.recommendedAction && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              <span className="font-medium">Recommended action:</span> {lead.recommendedAction}
            </div>
          )}
          {lead.issues.map((i) => (
            <div key={i.message} className={`rounded-lg border px-4 py-2.5 text-sm ${SEVERITY[i.severity]}`}>
              {i.message}
              {i.relatedLeadId && (
                <>
                  {" "}
                  <Link href={`/leads/${i.relatedLeadId}`} className="font-medium underline">
                    View {i.relatedLeadId}
                  </Link>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Lead details">
            <dl className="divide-y divide-slate-100">
              <Row label="Contact">{lead.contact.name ?? "—"}</Row>
              <Row label="Role">{lead.contact.role ?? "—"}</Row>
              <Row label="Email">{lead.contact.email ?? "—"}</Row>
              <Row label="Phone">{lead.contact.phone ?? "—"}</Row>
              <Row label="Deal value">{lead.dealValueBDT > 0 ? formatBDT(lead.dealValueBDT) : "—"}</Row>
              <Row label="Last contact">{formatDate(lead.lastContact)}</Row>
              <Row label="Next follow-up">{formatDate(lead.nextFollowUp)}</Row>
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{lead.notes || "No notes."}</p>
            </div>
          </Card>

          <Card title="AI follow-up email">
            <EmailDraft leadId={lead.leadId} />
          </Card>
        </div>

        <Card title="Edit lead">
          <LeadEditForm
            leadId={lead.leadId}
            initial={{
              stage: lead.stage,
              dealValueBDT: lead.dealValueBDT,
              lastContact: lead.lastContact,
              nextFollowUp: lead.nextFollowUp,
              notes: lead.notes,
              contact: {
                name: lead.contact.name ?? null,
                role: lead.contact.role ?? null,
                email: lead.contact.email ?? null,
                phone: lead.contact.phone ?? null,
              },
            }}
          />
        </Card>
      </div>
    </div>
  );
}