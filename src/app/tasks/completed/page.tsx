import type { Metadata } from "next";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { Badge, ButtonLink, EmptyState, LoadingRows, PageHeader, Section, Table, Td } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { taskStatus, totalHours } from "@/lib/estimation";
import { prisma } from "@/lib/prisma";
import { CAN_NOT_COMPLETE, FINISHED } from "@/lib/tasks";

export const metadata: Metadata = { title: "Completed Tasks" };

export default function CompletedTasksPage() {
  return (
    <>
      <PageHeader title="Completed Tasks">
        <ButtonLink href="/tasks" variant="secondary">
          Back to Tasks
        </ButtonLink>
      </PageHeader>
      <p className="-mt-3 text-sm text-muted">
        Closed tasks, grouped by how they ended. Admins also see everyone&apos;s.
      </p>
      <Suspense fallback={<LoadingRows />}>
        <CompletedTables />
      </Suspense>
    </>
  );
}

async function CompletedTables() {
  const user = await requireUser();
  const mine = { userId: user.id };

  const [myFinished, myCanNot, allFinished, allCanNot] = await Promise.all([
    findTasks({ ...FINISHED, ...mine }),
    findTasks({ ...CAN_NOT_COMPLETE, ...mine }),
    user.isAdmin ? findTasks(FINISHED) : null,
    user.isAdmin ? findTasks(CAN_NOT_COMPLETE) : null,
  ]);

  return (
    <>
      <Section title="My Completed Tasks">
        <TaskTable tasks={myFinished} />
      </Section>
      <Section title="My Can Not Complete">
        <TaskTable tasks={myCanNot} />
      </Section>
      {allFinished && (
        <Section title="Everyone's Completed Tasks">
          <TaskTable tasks={allFinished} showUser />
        </Section>
      )}
      {allCanNot && (
        <Section title="Everyone's Can Not Complete Tasks">
          <TaskTable tasks={allCanNot} showUser />
        </Section>
      )}
    </>
  );
}

function findTasks(where: Prisma.TaskWhereInput) {
  return prisma.task.findMany({
    where,
    include: { hours: { select: { hoursLogged: true } }, user: { select: { username: true } } },
    orderBy: [{ actualEndDate: "desc" }, { name: "asc" }],
  });
}

type Row = Awaited<ReturnType<typeof findTasks>>[number];

function TaskTable({ tasks, showUser = false }: { tasks: Row[]; showUser?: boolean }) {
  if (tasks.length === 0) return <EmptyState>Nothing here yet.</EmptyState>;
  return (
    <Table
      head={[
        "Name",
        ...(showUser ? ["User"] : []),
        "Status",
        "Start",
        "Est. End",
        "Ended",
        "Hours",
        "",
      ]}
    >
      {tasks.map((task) => {
        const status = taskStatus(task);
        return (
          <tr key={task.id}>
            <Td className="font-medium">{task.name}</Td>
            {showUser && <Td>{task.user.username}</Td>}
            <Td>
              <Badge tone={status === "Completed" ? "success" : status === "Can Not Complete" ? "danger" : "warning"}>
                {status}
              </Badge>
            </Td>
            <Td>{formatDate(task.startDate)}</Td>
            <Td>{formatDate(task.estEndDate)}</Td>
            <Td>{task.actualEndDate ? formatDate(task.actualEndDate) : "—"}</Td>
            <Td className="tabular-nums">{totalHours(task.hours)}</Td>
            <Td className="text-right">
              <ButtonLink href={`/tasks/${task.id}/hours`} variant="secondary" size="sm">
                View Hours
              </ButtonLink>
            </Td>
          </tr>
        );
      })}
    </Table>
  );
}
