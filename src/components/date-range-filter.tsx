import { DatePicker } from "@/components/date-picker";
import { Button, ButtonLink } from "@/components/ui";
import { parseDateInput, toDateInput } from "@/lib/dates";
import type { ReactNode } from "react";

export type DateRange = { start: Date | null; end: Date | null; error: string | null };

type Params = Record<string, string | string[] | undefined>;

export function param(params: Params, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

/** Reads ?start=&end= (yyyy-mm-dd). An inverted range is reported and ignored. */
export function readDateRange(params: Params): DateRange {
  const start = parseDateInput(param(params, "start"));
  const end = parseDateInput(param(params, "end"));
  if (start && end && start > end) {
    return { start: null, end: null, error: "The start date must be on or before the end date." };
  }
  return { start, end, error: null };
}

/**
 * The Search / Show All bar on the Tasks and Events pages. A plain GET form:
 * the filter lives in the URL, so it survives refreshes and can be shared.
 */
export function DateRangeFilter({
  basePath,
  range,
  children,
}: {
  basePath: string;
  range: DateRange;
  children?: ReactNode;
}) {
  return (
    <form action={basePath} className="mb-6 rounded-xl bg-white/90 p-4 shadow-sm ring-1 ring-line">
      {range.error && <p className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{range.error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-36 flex-1 space-y-1 text-sm font-medium">
          <label htmlFor="filter-start">Start date</label>
          <DatePicker id="filter-start" name="start" defaultValue={range.start ? toDateInput(range.start) : ""} placeholder="Any" />
        </div>
        <div className="min-w-36 flex-1 space-y-1 text-sm font-medium">
          <label htmlFor="filter-end">End date</label>
          <DatePicker id="filter-end" name="end" defaultValue={range.end ? toDateInput(range.end) : ""} placeholder="Any" />
        </div>
        {children}
        <div className="flex gap-2">
          <Button type="submit">Search</Button>
          <ButtonLink href={basePath} variant="secondary">
            Show All
          </ButtonLink>
        </div>
      </div>
    </form>
  );
}
