export const formatBDT = (n: number) => `BDT ${n.toLocaleString("en-US")}`;

// Dates are "YYYY-MM-DD" strings; format in UTC so the day never shifts with timezone.
export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}