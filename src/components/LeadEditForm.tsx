"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGE_ORDER } from "@/lib/leadLogic";

type Props = {
  leadId: string;
  initial: {
    stage: string;
    dealValueBDT: number;
    lastContact: string | null;
    nextFollowUp: string | null;
    notes: string;
    contact: { name: string | null; role: string | null; email: string | null; phone: string | null };
  };
};

const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function LeadEditForm({ leadId, initial }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    stage: initial.stage,
    dealValue: String(initial.dealValueBDT),
    lastContact: initial.lastContact ?? "",
    nextFollowUp: initial.nextFollowUp ?? "",
    notes: initial.notes,
    name: initial.contact.name ?? "",
    role: initial.contact.role ?? "",
    email: initial.contact.email ?? "",
    phone: initial.contact.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSaved(false);
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const value = f.dealValue.trim() === "" ? 0 : Number(f.dealValue);
    if (Number.isNaN(value) || value < 0) {
      setError("Deal value must be a number, 0 or more.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: f.stage,
          dealValueBDT: value,
          lastContact: f.lastContact,
          nextFollowUp: f.nextFollowUp,
          notes: f.notes,
          contact: { name: f.name, role: f.role, email: f.email, phone: f.phone },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fieldErrors = data?.details?.fieldErrors as Record<string, string[]> | undefined;
        const detail = fieldErrors
          ? Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ")
          : "";
        setError([data?.error ?? "Could not save changes.", detail].filter(Boolean).join(" — "));
        return;
      }
      setSaved(true);
      router.refresh(); // re-run the server page so overdue and issue flags recompute
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const label = "flex flex-col gap-1 text-xs font-medium text-slate-600";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Stage
          <select value={f.stage} onChange={set("stage")} className={input}>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Deal value (BDT)
          <input value={f.dealValue} onChange={set("dealValue")} inputMode="numeric" className={input} />
        </label>
        <label className={label}>
          Last contact
          <input type="date" value={f.lastContact} onChange={set("lastContact")} className={input} />
        </label>
        <label className={label}>
          Next follow-up
          <input type="date" value={f.nextFollowUp} onChange={set("nextFollowUp")} className={input} />
        </label>
        <label className={label}>
          Contact name
          <input value={f.name} onChange={set("name")} className={input} />
        </label>
        <label className={label}>
          Contact role
          <input value={f.role} onChange={set("role")} className={input} />
        </label>
        <label className={label}>
          Contact email
          <input value={f.email} onChange={set("email")} className={input} />
        </label>
        <label className={label}>
          Contact phone
          <input value={f.phone} onChange={set("phone")} className={input} />
        </label>
      </div>
      <label className={label}>
        Notes
        <textarea value={f.notes} onChange={set("notes")} rows={3} className={input} />
      </label>

      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved. Flags have been recalculated.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}