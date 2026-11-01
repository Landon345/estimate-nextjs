import type { Metadata } from "next";
import { Suspense } from "react";
import { updateTask } from "@/app/actions/tasks";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { EstimateFieldsFallback, TaskEstimateSection } from "@/components/task-estimate-section";
import { Button, ButtonLink, Field, FormCard, Input, LoadingRows } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, toDateInput } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { findTaskFor } from "@/lib/tasks";

export const metadata: Metadata = { title: "Edit Task" };

export default function EditTaskPage({ params }: PageProps<"/tasks/[id]/edit">) {
  return (
    <FormCard title="Edit Task">
      <Suspense fallback={<LoadingRows rows={2} />}>
        <EditTaskForm params={params} />
      </Suspense>
    </FormCard>
  );
}

async function EditTaskForm({ params }: { params: PageProps<"/tasks/[id]/edit">["params"] }) {
  const user = await requireUser();
  const task = await findTaskFor(user, Number((await params).id));

  if (!task) {
    return (
      <div className="space-y-4 text-center">
        <p>Task does not exist.</p>
        <ButtonLink href="/tasks" variant="secondary">
          Return to Tasks
        </ButtonLink>
      </div>
    );
  }

  const tags = await prisma.tag.findMany({ where: { tasks: { some: { id: task.id } } }, orderBy: { name: "asc" } });
  // Next keeps visited pages mounted in the background, and the fields' state
  // would outlive a save. Keying on the saved values rebuilds the form from them.
  const saved = [task.name, toDateInput(task.estEndDate), task.estimatedHours, task.lowHours, task.highHours, ...tags.map((t) => t.name)];

  return (
    <ActionForm key={saved.join("|")} action={updateTask.bind(null, task.id)}>
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" defaultValue={task.name} maxLength={25} required />
      </Field>
      <p className="text-sm text-muted">Started {formatDate(task.startDate)}</p>
      <Field label="Estimated End Date" htmlFor="estEndDate">
        <DatePicker
          id="estEndDate"
          name="estEndDate"
          defaultValue={toDateInput(task.estEndDate)}
          min={toDateInput(task.startDate)}
          required
        />
      </Field>
      <Suspense fallback={<EstimateFieldsFallback />}>
        <TaskEstimateSection
          userId={task.userId}
          defaults={{ ...task, tags: tags.map((t) => t.name) }}
        />
      </Suspense>
      <Field label="Why is the estimate changing?" htmlFor="reason">
        <Input id="reason" name="reason" maxLength={200} placeholder="Optional, e.g. scope grew" />
      </Field>
      <p className="-mt-3 text-xs text-muted">
        Changing the hours, range or end date keeps the original estimate in the task&apos;s history.
      </p>
      <div className="grid gap-2 pt-2">
        <Button type="submit">Save Changes</Button>
        <ButtonLink href="/tasks" variant="secondary">
          Return to Tasks
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
