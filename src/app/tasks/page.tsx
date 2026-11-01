import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { closeTask, logHoursToday, type CloseReason } from "@/app/actions/tasks";
import { ActionForm } from "@/components/action-form";
import { DateRangeFilter, param, readDateRange } from "@/components/date-range-filter";
import { Badge, Button, ButtonLink, Card, EmptyState, Input, LoadingRows, PageHeader, Select, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { addDays, formatDate, today } from "@/lib/dates";
import { totalHours } from "@/lib/estimation";
import { prisma } from "@/lib/prisma";
import { OPEN, userTagNames } from "@/lib/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <>
      <PageHeader title="My Tasks">
        <ButtonLink href="/tasks/completed" variant="secondary">
          View Completed Tasks
        </ButtonLink>
        <ButtonLink href="/tasks/new">Create New Task</ButtonLink>
      </PageHeader>
      <Suspense fallback={<LoadingRows />}>
        <TaskBoard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TaskBoard({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const user = await requireUser();
  const params = await searchParams;
  const range = readDateRange(params);
  const tag = param(params, "tag");
  const now = today();

  const [tasks, dueSoon, tagNames] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...OPEN,
        userId: user.id,
        estEndDate: { gte: range.start ?? undefined, lte: range.end ?? undefined },
        ...(tag ? { tags: { some: { name: tag } } } : {}),
      },
      include: {
        hours: { select: { hoursLogged: true } },
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        revisions: { select: { estimatedHours: true }, orderBy: { id: "asc" }, take: 1 },
      },
      orderBy: [{ estEndDate: "asc" }, { name: "asc" }],
    }),
    prisma.task.findMany({
      where: { ...OPEN, userId: user.id, estEndDate: { gte: now, lte: addDays(now, 7) } },
      select: { id: true, name: true },
      orderBy: { estEndDate: "asc" },
    }),
    userTagNames(user.id),
  ]);

  return (
    <>
      {dueSoon.length > 0 && (
        <div role="status" className="mb-6 rounded-lg bg-info-soft px-4 py-3 text-sm text-info ring-1 ring-info/20">
          <p className="font-semibold">Due within the week:</p>
          <ul className="mt-1 list-inside list-disc">
            {dueSoon.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </div>
      )}

      <DateRangeFilter basePath="/tasks" range={range}>
        {tagNames.length > 0 && (
          <label className="min-w-36 flex-1 space-y-1 text-sm font-medium">
            <span>Tag</span>
            <Select name="tag" defaultValue={tag}>
              <option value="">Any tag</option>
              {tagNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
        )}
      </DateRangeFilter>

      {tasks.length === 0 ? (
        <EmptyState>
          No tasks to display.{" "}
          <Link href="/tasks/new" className="font-medium text-brand underline">
            Create one
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={{
                ...task,
                tags: task.tags.map((t) => t.name),
                originalHours: task.revisions[0]?.estimatedHours ?? task.estimatedHours,
                hoursLogged: totalHours(task.hours),
              }}
              overdue={task.estEndDate < now}
            />
          ))}
        </div>
      )}
    </>
  );
}

type CardTask = {
  id: number;
  name: string;
  tags: string[];
  startDate: Date;
  estEndDate: Date;
  estimatedHours: number;
  originalHours: number;
  hoursLogged: number;
};

function TaskCard({ task, overdue }: { task: CardTask; overdue: boolean }) {
  const progress = Math.min(100, Math.round((task.hoursLogged / task.estimatedHours) * 100));
  return (
    <Card className="flex flex-col">
      <div className="border-b border-line px-5 py-3">
        <h2 className="truncate font-semibold" title={task.name}>
          {task.name}
        </h2>
        {task.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Link key={tag} href={`/tasks?tag=${encodeURIComponent(tag)}`}>
                <Badge tone="brand">{tag}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-3 px-5 py-4 text-sm">
        <div>
          <div className="flex justify-between">
            <span className="font-semibold">Hours logged</span>
            <span className="tabular-nums">
              {task.hoursLogged} / {task.estimatedHours} est.
              {task.originalHours !== task.estimatedHours && (
                <span className="text-muted" title="The estimate when the task was created">
                  {" "}
                  (orig. {task.originalHours})
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-y-1 text-muted">
          <dt>Start date</dt>
          <dd className="text-right text-ink">{formatDate(task.startDate)}</dd>
          <dt>Planned end</dt>
          <dd className={`text-right ${overdue ? "font-semibold text-danger" : "text-ink"}`}>
            {formatDate(task.estEndDate)}
          </dd>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
        <ButtonLink href={`/tasks/${task.id}/edit`} variant="secondary" size="sm">
          Edit
        </ButtonLink>
        <ButtonLink href={`/tasks/${task.id}/hours`} variant="secondary" size="sm">
          Hours
        </ButtonLink>
        <QuickLogMenu taskId={task.id} />
        <CloseMenu taskId={task.id} />
      </div>
    </Card>
  );
}

function Menu({ label, variant, children }: { label: string; variant: "primary" | "danger"; children: ReactNode }) {
  return (
    <details className="group relative">
      <summary className={buttonClass(variant, "sm", "cursor-pointer select-none")}>
        {label} <span className="text-xs transition group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-60 rounded-lg bg-white p-3 shadow-lg ring-1 ring-line">{children}</div>
    </details>
  );
}

function QuickLogMenu({ taskId }: { taskId: number }) {
  const action = logHoursToday.bind(null, taskId);
  return (
    <Menu label="Log" variant="primary">
      <p className="mb-2 text-xs text-muted">Hours added here are logged for today.</p>
      <ActionForm action={action} className="space-y-2">
        <div className="grid grid-cols-5 gap-1">
          {[1, 2, 3, 5, 10].map((h) => (
            <Button key={h} name="hours" value={h} variant="secondary" size="sm" className="px-0">
              +{h}
            </Button>
          ))}
        </div>
      </ActionForm>
      <ActionForm action={action} className="mt-2 space-y-2">
        <div className="flex gap-2">
          <Input name="hours" type="number" min={1} max={24} placeholder="Hours" aria-label="Custom hours" required />
          <Button size="md">Add</Button>
        </div>
      </ActionForm>
    </Menu>
  );
}

const CLOSE_OPTIONS: { reason: CloseReason; label: string }[] = [
  { reason: "completed", label: "Completed" },
  { reason: "dropped", label: "Dropped" },
  { reason: "willNotComplete", label: "Will Not Complete" },
  { reason: "canNotComplete", label: "Can Not Complete" },
];

function CloseMenu({ taskId }: { taskId: number }) {
  return (
    <Menu label="Close" variant="danger">
      <p className="mb-2 text-xs text-muted">Close this task as:</p>
      <div className="grid gap-1">
        {CLOSE_OPTIONS.map(({ reason, label }) => (
          <form key={reason} action={closeTask.bind(null, taskId, reason)}>
            <Button variant="secondary" size="sm" className="w-full">
              {label}
            </Button>
          </form>
        ))}
      </div>
    </Menu>
  );
}
