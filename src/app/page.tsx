import Link from "next/link";
import { getDashboardData } from "@/lib/leadService";
import { formatBDT, formatDate } from "@/lib/format";
import StageBadge, { STAGE_BAR } from "@/components/StageBadge";

export const dynamic = "force-dynamic";

const ISSUE_LABELS: Record<string, string> = {
  missing_contact: "Missing contact details",
  contradiction: "Notes contradict fields",
  suspicious_email: "Suspicious email",
  duplicate: "Duplicate records",
  invalid_date_order: "Dates in wrong order",
  stage_inconsistency: "Stage inconsistency",
};

function StatCard({
  label, value, sub, href, tone = "default",
}: {
  label: string; value: string; sub: string; href?: string; tone?: "default" | "danger" | "warn";
}) {
  const accent =
    tone === "danger" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  const card = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function DashboardPage() {
  const d = await getDashboardData();
  const maxCount = Math.max(...d.stageTotals.map((s) => s.count), 1);
  const issueEntries = Object.entries(d.issueCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Pipeline snapshot as of {formatDate(d.referenceDate)}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total leads" value={String(d.totalLeads)} sub="Across all stages" href="/leads" />
        <StatCard label="Total deal value" value={formatBDT(d.totalDealValueBDT)} sub="All leads, including duplicates" />
        <StatCard
          label="Overdue follow-ups"
          value={String(d.overdueCount)}
          sub="Follow-up date before reference date"
          href="/leads?overdue=true"
          tone="danger"
        />
        <StatCard
          label="Leads with data issues"
          value={String(d.leadsWithIssues)}
          sub="Missing, duplicate or inconsistent data"
          href="/leads?issues=true"
          tone="warn"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Pipeline by stage">
          <ul className="space-y-3">
            {d.stageTotals.map((s) => (
              <li key={s.stage}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{s.stage}</span>
                  <span className="text-slate-500">
                    {s.count} · {formatBDT(s.totalValueBDT)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${STAGE_BAR[s.stage] ?? "bg-slate-400"}`}
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={`Overdue follow-ups (${d.overdueCount})`}
          action={
            <Link href="/leads?overdue=true" className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          }
        >
          {d.overdue.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing overdue. Nice work.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.overdue.map((o) => (
                <li key={o.leadId} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/leads/${o.leadId}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                        {o.company}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {o.leadId} · due {formatDate(o.nextFollowUp)}
                      </p>
                    </div>
                    <StageBadge stage={o.stage} />
                  </div>
                  {o.advice && (
                    <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{o.advice}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Upcoming follow-ups">
          <ul className="divide-y divide-slate-100">
            {d.upcoming.map((u) => (
              <li key={u.leadId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link href={`/leads/${u.leadId}`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                    {u.company}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {u.leadId} · {formatDate(u.nextFollowUp)}
                  </p>
                </div>
                <StageBadge stage={u.stage} />
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Data quality"
          action={
            <Link href="/leads?issues=true" className="text-xs font-medium text-indigo-600 hover:underline">
              Review flagged leads
            </Link>
          }
        >
          {issueEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No data-quality issues found.</p>
          ) : (
            <ul className="space-y-2">
              {issueEntries.map(([type, count]) => (
                <li key={type} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{ISSUE_LABELS[type] ?? type}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {d.duplicates.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duplicate pairs</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {d.duplicates.map((p) => (
                  <li key={`${p.a}-${p.b}`}>
                    {p.a} / {p.b} <span className="text-xs text-slate-500">· {p.kind}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}