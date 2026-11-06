"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600">
        The page could not load its data. Check that the database is reachable, then try again.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  );
}