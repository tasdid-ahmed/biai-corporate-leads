
import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <SearchX size={30} strokeWidth={1.8} />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Error 404
        </p>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Page not found
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500 sm:text-base">
          The page you're looking for doesn't exist or may have been moved.
          Let's get you back to your sales pipeline.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Home size={17} />
            Back to Dashboard
          </Link>

          <Link
            href="/leads"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            View All Leads
          </Link>
        </div>

        <p className="mt-12 text-xs text-slate-400">
          BIAI Sales Intelligence
        </p>
      </div>
    </main>
  );
}
