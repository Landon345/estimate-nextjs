import type { Metadata } from "next";
import { Suspense } from "react";
import { deleteHours } from "@/app/actions/tasks";
import { HoursChart, type HoursPoint } from "@/components/hours-chart";
import { Badge, Button, ButtonLink, Card, EmptyState, LoadingRows, PageHeader, Section, Table, Td } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, toDateInput } from "@/lib/dates";
import { totalHours } from "@/lib/estimation";
import { prisma } from "@/lib/prisma";
import { findTaskFor } from "@/lib/tasks";

export const metadata: Metadata = { title: "Task Hours" };

type Params = PageProps<"/tasks/[id]/hours">["params"];

export default function TaskHoursPage({ params }: PageProps<"/tasks/[id]/hours">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Task Hours" />
          <LoadingRows />
        </>
      }
    >
      <TaskHours params={params} />
    </Suspense>
  );
}

async function TaskHours({ params }: { params: Params }) {
  const user = await requireUser();
  const task = await findTaskFor(user, Number((await params).id));
  if (!task) {
    return (
      <>
        <PageHeader title="Task Hours" />
        <EmptyState>Task does not exist.</EmptyState>
      </>
    );
  }

  const [hours, revisions, tags] = await Promise.all([
    prisma.hourLog.findMany({ where: { taskId: task.id }, orderBy: [{ date: "desc" }, { id: "desc" }] }),
    prisma.estimateRevision.findMany({ where: { taskId: task.id }, orderBy: { id: "asc" } }),
    prisma.tag.findMany({ where: { tasks: { some: { id: task.id } } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title={`Hours · ${task.name}`}>
        <ButtonLink href={`/tasks/${task.id}/hours/new`}>Add Hour Record</ButtonLink>
        <ButtonLink href="/tasks" variant="secondary">
          Back to Tasks
        </ButtonLink>
      </PageHeader>

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>
          {totalHours(hours)} of {task.estimatedHours} estimated hours logged · {formatDate(task.startDate)} to{" "}
          {formatDate(task.estEndDate)}
        </span>
        {tags.map((t) => (
          <Badge key={t.id} tone="brand">
            {t.name}
          </Badge>
        ))}
      </div>

      {hours.length === 0 ? (
        <EmptyState>No hours logged.</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Table head={["Date", "Hours", ""]}>
            {hours.map((h) => (
              <tr key={h.id}>
                <Td>{formatDate(h.date)}</Td>
                <Td className="tabular-nums">{h.hoursLogged}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <ButtonLink href={`/tasks/${task.id}/hours/${h.id}/edit`} variant="warning" size="sm">
                      Edit
                    </ButtonLink>
                    <form action={deleteHours.bind(null, h.id)}>
                      <Button variant="danger" size="sm">
                        Delete
                      </Button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <Card className="p-5">
            <HoursChart points={chartPoints(task, hours)} />
          </Card>
        </div>
      )}

      {revisions.length > 0 && (
        <Section title="Estimate history">
          <Table head={["When", "Estimate", "80% range", "End date", "Reason"]}>
            {revisions.map((r, i) => (
              <tr key={r.id}>
                <Td>
                  {i === 0 ? <Badge tone="info">Original</Badge> : formatDate(r.createdAt)}
                </Td>
                <Td className="tabular-nums">{r.estimatedHours}h</Td>
                <Td className="tabular-nums">{r.lowHours !== null ? `${r.lowHours}–${r.highHours}h` : "—"}</Td>
                <Td>{formatDate(r.estEndDate)}</Td>
                <Td className="text-muted">{r.reason ?? ""}</Td>
              </tr>
            ))}
          </Table>
        </Section>
      )}
    </>
  );
}

/**
 * Hours summed per day, plus zero-height entries for the start and estimated
 * end dates so the chart spans the whole planned window (as setupGraph did).
 */
function chartPoints(
  task: { startDate: Date; estEndDate: Date },
  hours: { date: Date; hoursLogged: number }[],
): HoursPoint[] {
  const byDay = new Map<string, { date: Date; hours: number; marker?: string }>();
  const add = (date: Date, value: number, marker?: string) => {
    const key = toDateInput(date);
    const entry = byDay.get(key) ?? { date, hours: 0 };
    entry.hours += value;
    if (marker) entry.marker = entry.marker ? `${entry.marker} / ${marker}` : marker;
    byDay.set(key, entry);
  };
  add(task.startDate, 0, "Start");
  add(task.estEndDate, 0, "Est. end");
  hours.forEach((h) => add(h.date, h.hoursLogged));

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, e]) => ({ date: formatDate(e.date), hours: e.hours, marker: e.marker }));
}
