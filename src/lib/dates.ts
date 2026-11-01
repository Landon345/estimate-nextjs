// Every date in the app is a calendar day with no time of day. Postgres stores
// them as DATE and Prisma hands them back as UTC midnight, so all formatting
// and arithmetic here works in UTC to keep a day from sliding across zones.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse an `<input type="date">` value (yyyy-mm-dd). Returns null when invalid. */
export function parseDateInput(value: FormDataEntryValue | string | null | undefined): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects impossible days like 2025-02-31, which Date would roll over.
  return !Number.isNaN(date.getTime()) && toDateInput(date) === value ? date : null;
}

/** yyyy-mm-dd, for `<input type="date">` values and URLs. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** MM/dd/yyyy */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/** Weekday, MM/dd/yyyy */
export function formatLongDate(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" });
  return `${weekday}, ${formatDate(date)}`;
}

/** Today's local calendar day, as UTC midnight to match stored dates. */
export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Whole days between two calendar days, ignoring order. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / DAY_MS);
}

/** First and last day of a yyyy-mm month string, or null when it doesn't parse. */
export function monthRange(month: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 0)),
  };
}

/** yyyy-mm for the month containing `date`. */
export function toMonthInput(date: Date): string {
  return date.toISOString().slice(0, 7);
}
