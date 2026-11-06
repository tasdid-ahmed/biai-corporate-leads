"use client";

import { useState } from "react";

type Draft = { to: string | null; subject: string; body: string; warnings: string[] };

const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function EmailDraft({ leadId }: { leadId: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canForce, setCanForce] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate(force = false) {
    setLoading(true);
    setError(null);
    setCanForce(false);
    setCopied(false);
    try {
      const res = await fetch(`/api/leads/${leadId}/email${force ? "?force=true" : ""}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not draft the email.");
        setCanForce(!!data?.canForce);
        setDraft(null);
        return;
      }
      setDraft(data as Draft);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => generate()}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? "Drafting…" : draft ? "Regenerate draft" : "Generate draft"}
        </button>
        <p className="text-xs text-slate-500">Draft only. Nothing is ever sent automatically.</p>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p>{error}</p>
          {canForce && (
            <button onClick={() => generate(true)} className="mt-1 text-xs font-medium underline">
              Draft anyway
            </button>
          )}
        </div>
      )}

      {draft && (
        <div className="space-y-3">
          {draft.warnings.length > 0 && (
            <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {draft.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
          <p className="text-sm text-slate-600">
            To: <span className="font-medium text-slate-900">{draft.to ?? "No email address on file"}</span>
          </p>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Subject
            <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Body (edit before copying)
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={10} className={input} />
          </label>
          <button
            onClick={copy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? "Copied" : "Copy email"}
          </button>
        </div>
      )}
    </div>
  );
}