
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

// Matches the response from /api/dashboard
type DashboardData = {
  referenceDate: string;
  totalLeads: number;
  totalDealValueBDT: number;
  overdueCount: number;
  leadsWithIssues: number;
  issueCounts: Record<string, number>;
  duplicates: {
    a: string;
    b: string;
    kind: "exact" | "probable";
    reason: string;
  }[];
};

// Matches AskRow in src/lib/askEngine.ts
type AskRow = {
  leadId: string;
  company: string;
  stage: string;
  dealValueBDT: number;
  nextFollowUp: string | null;
  note: string | null;
};

// Matches the response from POST /api/ask
type AskResponse = {
  answer: string;
  rows: AskRow[];
  caveats: string[];
};

type Message = {
  id: number;
  question: string;
  response?: AskResponse;
  error?: string;
};

const SUGGESTIONS = [
  "Which deals are overdue?",
  "What is the total value in Proposal stage?",
  "Show me all duplicate leads.",
  "Which leads have missing contact information?",
  "Which leads are waiting for payment?",
  "Find Padma Textiles.",
];

const ISSUE_LABELS: Record<string, string> = {
  missing_contact: "Missing contact details",
  contradiction: "Contradictory notes",
  suspicious_email: "Suspicious email",
  duplicate: "Duplicate records",
  invalid_date_order: "Invalid date order",
  stage_inconsistency: "Stage inconsistency",
};

const ISSUE_DESCRIPTIONS: Record<string, string> = {
  missing_contact: "Contact name, email or phone is missing",
  contradiction: "Notes conflict with recorded contact details",
  suspicious_email: "Email address needs manual verification",
  duplicate: "Potentially repeated company or opportunity",
  invalid_date_order: "Follow-up date is before last contact",
  stage_inconsistency: "Stage does not match payment or deal notes",
};

function formatBDT(value: number) {
  return `BDT ${value.toLocaleString("en-US")}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(
    Date.UTC(year, month - 1, day)
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  color = "slate",
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof Users;
  color?: "slate" | "amber" | "rose";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>

        <span className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon size={17} />
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function AssistantPage() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [dashboardError, setDashboardError] = useState("");

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const [asking, setAsking] = useState(false);

  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Load dashboard and data-quality information
  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not load dashboard information."
          );
        }

        if (active) {
          setDashboard(data);
        }
      } catch (error) {
        if (active) {
          setDashboardError(
            error instanceof Error
              ? error.message
              : "Could not load dashboard information."
          );
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  // Send a question to the existing AI API
  async function askQuestion(value: string) {
    const trimmed = value.trim();

    if (!trimmed || asking) return;

    const messageId = Date.now();

    setQuestion("");
    setAsking(true);

    setMessages((current) => [
      ...current,
      {
        id: messageId,
        question: trimmed,
      },
    ]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to answer your question."
        );
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                response: data as AskResponse,
              }
            : message
        )
      );
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                error:
                  error instanceof Error
                    ? error.message
                    : "Something went wrong.",
              }
            : message
        )
      );
    } finally {
      setAsking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(question);
  }

  async function copyAnswer(answer: string, id: number) {
    try {
      await navigator.clipboard.writeText(answer);
      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      setCopiedId(null);
    }
  }

  const issueEntries = Object.entries(
    dashboard?.issueCounts ?? {}
  )
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Page heading */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <Sparkles size={14} />
            AI-powered insights
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            AI Assistant
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Ask questions about your corporate leads, sales pipeline,
            follow-ups and data quality.
          </p>
        </div>

        <Link
          href="/leads"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Browse all leads
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Overview metrics */}
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total leads"
          value={dashboard?.totalLeads ?? 0}
          description="Records in the pipeline"
          icon={Users}
        />

        <MetricCard
          label="Overdue follow-ups"
          value={dashboard?.overdueCount ?? 0}
          description="Based on assessment reference date"
          icon={AlertCircle}
          color="rose"
        />

        <MetricCard
          label="Leads with data issues"
          value={dashboard?.leadsWithIssues ?? 0}
          description="Records requiring review"
          icon={AlertTriangle}
          color="amber"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">

        {/* AI Assistant */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <MessageSquareText size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Ask about your pipeline
              </h2>

              <p className="text-xs text-slate-500">
                Answers are calculated from your actual lead records.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5">

            {/* Empty state */}
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
                  <Bot size={22} />
                </div>

                <h3 className="mt-3 text-sm font-semibold text-slate-800">
                  What would you like to know?
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  Ask in plain English. I can find overdue leads,
                  summarize stages, identify duplicates and more.
                </p>
              </div>
            ) : (
              /* Conversation */
              <div className="min-h-[220px] max-h-[560px] space-y-5 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="space-y-3"
                  >
                    {/* User question */}
                    <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-3 text-sm text-white">
                      {message.question}
                    </div>

                    {/* AI answer */}
                    {message.response && (
                      <div className="max-w-[96%] rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 p-4">

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
                            <Sparkles size={14} />
                            BIAI Assistant
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void copyAnswer(
                                message.response!.answer,
                                message.id
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            <Copy size={13} />
                            {copiedId === message.id
                              ? "Copied"
                              : "Copy"}
                          </button>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                          {message.response.answer}
                        </p>

                        {/* Caveats */}
                        {message.response.caveats.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.response.caveats.map(
                              (caveat, index) => (
                                <div
                                  key={index}
                                  className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
                                >
                                  <AlertTriangle
                                    size={15}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <span>{caveat}</span>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {/* Matching leads */}
                        {message.response.rows.length > 0 && (
                          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full min-w-[520px] text-left text-xs">
                              <thead className="bg-slate-100 text-slate-500">
                                <tr>
                                  <th className="px-3 py-2 font-medium">
                                    Lead
                                  </th>
                                  <th className="px-3 py-2 font-medium">
                                    Stage
                                  </th>
                                  <th className="px-3 py-2 text-right font-medium">
                                    Deal value
                                  </th>
                                  <th className="px-3 py-2 font-medium">
                                    Next follow-up
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {message.response.rows.map((row) => (
                                  <tr key={row.leadId}>
                                    <td className="px-3 py-2.5">
                                      <Link
                                        href={`/leads/${row.leadId}`}
                                        className="font-medium text-indigo-700 hover:underline"
                                      >
                                        {row.company}
                                      </Link>

                                      <p className="mt-0.5 text-[11px] text-slate-400">
                                        {row.leadId}
                                      </p>

                                      {row.note && (
                                        <p className="mt-1 max-w-xs text-[11px] leading-4 text-slate-500">
                                          {row.note}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-3 py-2.5 text-slate-600">
                                      {row.stage}
                                    </td>

                                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                                      {formatBDT(row.dealValueBDT)}
                                    </td>

                                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                                      {formatDate(row.nextFollowUp)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {message.error && (
                      <div className="flex max-w-[96%] gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                        <AlertCircle
                          size={16}
                          className="mt-0.5 shrink-0"
                        />
                        {message.error}
                      </div>
                    )}
                  </div>
                ))}

                {asking && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 size={15} className="animate-spin" />
                    Analysing your question...
                  </div>
                )}
              </div>
            )}

            {/* Question input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2"
            >
              <label
                className="sr-only"
                htmlFor="assistant-question"
              >
                Ask a question
              </label>

              <textarea
                id="assistant-question"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void askQuestion(question);
                  }
                }}
                maxLength={300}
                rows={2}
                placeholder="e.g. Which deals are overdue?"
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <button
                type="submit"
                disabled={!question.trim() || asking}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {asking ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}

                <span className="hidden sm:inline">Ask</span>
              </button>
            </form>

            {/* Suggested questions */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">
                Try asking
              </p>

              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={asking}
                    onClick={() =>
                      void askQuestion(suggestion)
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Right sidebar: data quality */}
        <aside className="space-y-6">

          {/* Data quality overview */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Data quality overview
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Issues detected across the pipeline
                </p>
              </div>

              <AlertTriangle
                size={18}
                className="text-amber-500"
              />
            </div>

            <div className="p-5">
              {dashboardError ? (
                <p className="text-sm text-rose-600">
                  {dashboardError}
                </p>
              ) : !dashboard ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Loading data quality...
                </div>
              ) : issueEntries.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 size={17} />
                  No data-quality issues found.
                </div>
              ) : (
                <ul className="space-y-3">
                  {issueEntries.map(([type, count]) => (
                    <li key={type}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          {ISSUE_LABELS[type] ?? type}
                        </span>

                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800">
                          {count}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {ISSUE_DESCRIPTIONS[type] ??
                          "Review this data-quality category"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/leads?issues=true"
                className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Review flagged leads
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Duplicate review */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Duplicate review
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Potentially repeated company records
              </p>
            </div>

            <div className="p-5">
              {!dashboard ? (
                <p className="text-sm text-slate-500">
                  Loading duplicate checks...
                </p>
              ) : dashboard.duplicates.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 size={17} />
                  No duplicates detected.
                </div>
              ) : (
                <>
                  <p className="mb-3 text-2xl font-semibold text-slate-900">
                    {dashboard.duplicates.length}
                    <span className="text-sm font-normal text-slate-500">
                      {" "}pairs found
                    </span>
                  </p>

                  <ul className="space-y-2">
                    {dashboard.duplicates.map((pair) => (
                      <li
                        key={`${pair.a}-${pair.b}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-700">
                          {pair.a} / {pair.b}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 font-medium ${
                            pair.kind === "exact"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {pair.kind}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Link
                href="/leads?issues=true"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Inspect duplicate records
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* How the assistant works */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-indigo-600"
              />

              <p className="text-xs leading-5 text-indigo-900">
                <strong>Grounded answers:</strong> AI interprets your
                question, while the application calculates figures and
                retrieves matching leads from the database. Duplicate
                and data-quality caveats are shown where relevant.
              </p>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
