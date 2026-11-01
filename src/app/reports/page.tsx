import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { param } from "@/components/date-range-filter";
import { Badge, Button, Card, EmptyState, Input, LoadingRows, PageHeader, Table, Td, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, monthRange, toMonthInput, today } from "@/lib/dates";
import { summarize, type ReportRow, type TaskStatus } from "@/lib/estimation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reports" };

/**
 * One report per month: every task of the user's whose estimated end date
 * falls in that month, with estimated vs actual duration and accuracy.
 * (Replaces the Index → ViewReport pair, which passed the report through
 * session state.)
 */
export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <>
      <PageHeader title="Reports" />
      <Suspense fallback={<LoadingRows />}>
        <MonthlyReport searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function shiftMonth(month: string, delta: number): string {
  const range = monthRange(month)!;
  return toMonthInput(new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() + delta, 1)));
}

async function MonthlyReport({ searchParams }: { searchParams: PageProps<"/reports">["searchParams"] }) {
  const user = await requireUser();
  const requested = param(await searchParams, "month");
  const month = monthRange(requested) ? requested : toMonthInput(today());
  const range = monthRange(month)!;
  const monthLabel = range.start.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, estEndDate: { gte: range.start, lte: range.end } },
    include: {
      hours: { select: { hoursLogged: true } },
      revisions: { select: { estEndDate: true }, orderBy: { id: "asc" } },
    },
    orderBy: [{ estEndDate: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <form action="/reports" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white/90 p-4 shadow-sm ring-1 ring-line">
        <Link href={`/reports?month=${shiftMonth(month, -1)}`} className={buttonClass("secondary")} aria-label="Previous month">
          ←
        </Link>
        <label className="space-y-1 text-sm font-medium">
          <span>Month</span>
          <Input type="month" name="month" defaultValue={month} className="w-44" />
        </label>
        <Link href={`/reports?month=${shiftMonth(month, 1)}`} className={buttonClass("secondary")} aria-label="Next month">
          →
        </Link>
        <Button type="submit">Generate Report</Button>
      </form>

      <h2 className="mb-4 text-lg font-semibold">
        {monthLabel}
        <span className="ml-2 text-sm font-normal text-muted">generated {formatDate(today())}</span>
      </h2>

      {tasks.length === 0 ? <EmptyState>No tasks due in {monthLabel}.</EmptyState> : <Report tasks={tasks} />}
    </>
  );
}

function Report({ tasks }: { tasks: Parameters<typeof summarize>[0] }) {
  const report = summarize(tasks);
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total tasks" value={report.rows.length} />
        <Stat label="Avg. estimate (days)" value={report.meanEstimated} />
        <Stat label="Avg. actual (days)" value={report.meanActual} />
        <Stat label="Avg. accuracy" value={`${report.meanAccuracy}%`} note={report.tendencyLabel} />
      </div>

      <Table
        head={["Task", "Estimated (days)", "Actual (days)", "Status", "Hours logged", "Net gain/loss", "Accuracy"]}
      >
        {report.rows.map((row, i) => (
          <tr key={i}>
            <Td className="font-medium">
              {row.name}
              {row.reestimated && (
                <span className="ml-2 text-xs font-normal text-muted" title="Measured against the original estimate">
                  re-estimated
                </span>
              )}
            </Td>
            <Td className="tabular-nums">{row.estimatedDays}</Td>
            <Td className="tabular-nums">{row.actualDays}</Td>
            <Td>
              <StatusBadge status={row.status} />
            </Td>
            <Td className="tabular-nums">{row.hoursLogged}</Td>
            <Td className="tabular-nums">
              <NetDays row={row} />
            </Td>
            <Td className="tabular-nums">{row.accuracy}%</Td>
          </tr>
        ))}
        <tr className="border-t-2 border-line font-semibold">
          <Td>Mean</Td>
          <Td className="tabular-nums">{report.meanEstimated}</Td>
          <Td className="tabular-nums">{report.meanActual}</Td>
          <Td />
          <Td className="tabular-nums">{report.meanHoursLogged}</Td>
          <Td className="tabular-nums">{report.meanNet}</Td>
          <Td className="tabular-nums">
            {report.meanAccuracy}% <span className="font-normal text-muted">· {report.tendencyLabel}</span>
          </Td>
        </tr>
      </Table>
      <p className="mt-3 text-xs text-muted">
        Estimates are the original ones, before any re-estimating. Open tasks are measured up to today. Net is estimated
        minus actual days: positive means it finished ahead of the estimate.
      </p>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </Card>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const tone = { Completed: "success", "In Progress": "info", Dropped: "neutral", "Will Not Complete": "warning", "Can Not Complete": "danger" } as const;
  return <Badge tone={tone[status]}>{status}</Badge>;
}

function NetDays({ row }: { row: ReportRow }) {
  if (row.netDays > 0) return <span className="text-success">+{row.netDays}</span>;
  if (row.netDays < 0) return <span className="text-danger">{row.netDays}</span>;
  return <span>0</span>;
}
