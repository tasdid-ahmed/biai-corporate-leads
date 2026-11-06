const BADGE: Record<string, string> = {
  New: "bg-slate-100 text-slate-700 ring-slate-200",
  Contacted: "bg-sky-50 text-sky-700 ring-sky-200",
  Meeting: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  Proposal: "bg-violet-50 text-violet-700 ring-violet-200",
  "Invoice sent": "bg-amber-50 text-amber-800 ring-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const STAGE_BAR: Record<string, string> = {
  New: "bg-slate-400",
  Contacted: "bg-sky-500",
  Meeting: "bg-indigo-500",
  Proposal: "bg-violet-500",
  "Invoice sent": "bg-amber-500",
  Paid: "bg-emerald-500",
  Lost: "bg-rose-400",
};

export default function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        BADGE[stage] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {stage}
    </span>
  );
}