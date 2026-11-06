export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-slate-200" />
        <div className="h-72 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}