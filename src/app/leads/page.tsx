import Link from "next/link";
import { getAllLeads, enrichLeads, filterLeads } from "@/lib/leadService";
import { STAGE_ORDER } from "@/lib/leadLogic";
import { formatBDT, formatDate } from "@/lib/format";
import StageBadge from "@/components/StageBadge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const stage = one(sp.stage);
  const industry = one(sp.industry);
  const overdue = one(sp.overdue) === "true";
  const issues = one(sp.issues) === "true";

  const { leads } = enrichLeads(await getAllLeads());
  const industries = [...new Set(leads.map((l) => l.industry).filter((i): i is string => !!i))].sort();
  const rows = filterLeads(leads, { q, stage, industry, overdue, issues });
  const filtersActive = !!(q || stage || industry || overdue || issues);

  const field =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500">
          Showing {rows.length} of {leads.length} leads
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          Search
          <input name="q" defaultValue={q} placeholder="Company, contact, email or ID" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Stage
          <select name="stage" defaultValue={stage} className={field}>
            <option value="">All stages</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Industry
          <select name="industry" defaultValue={industry} className={field}>
            <option value="">All industries</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" name="overdue" value="true" defaultChecked={overdue} className="h-4 w-4 rounded border-slate-300" />
          Overdue only
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" name="issues" value="true" defaultChecked={issues} className="h-4 w-4 rounded border-slate-300" />
          Has data issues
        </label>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Apply
          </button>
          {filtersActive && (
            <Link href="/leads" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Reset
            </Link>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 text-right font-medium">Deal value</th>
              <th className="px-4 py-3 font-medium">Next follow-up</th>
              <th className="px-4 py-3 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No leads match these filters.{" "}
                  <Link href="/leads" className="font-medium text-indigo-600 hover:underline">
                    Clear filters
                  </Link>
                </td>
              </tr>
            )}
            {rows.map((l) => {
              const dateError = l.issues.some((i) => i.type === "invalid_date_order");
              return (
                <tr key={l.leadId} className={l.isOverdue ? "bg-rose-50/50" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.leadId}`} className="font-medium text-slate-900 hover:underline">
                      {l.company}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {l.leadId} · {l.contact.name ?? "No contact name"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{l.industry ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StageBadge stage={l.stage} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {l.dealValueBDT > 0 ? formatBDT(l.dealValueBDT) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={l.isOverdue ? "font-medium text-rose-700" : "text-slate-700"}>
                      {formatDate(l.nextFollowUp)}
                    </span>
                    {l.isOverdue && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Overdue</span>
                    )}
                    {dateError && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Date error</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.issues.length > 0 ? (
                      <span
                        title={l.issues.map((i) => i.message).join("\n")}
                        className="cursor-help rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
                      >
                        {l.issues.length} {l.issues.length === 1 ? "issue" : "issues"}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}