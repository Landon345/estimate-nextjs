import type { Metadata } from "next";
import { Suspense } from "react";
import { createDemoTasks, createTask } from "@/app/actions/tasks";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { EstimateFieldsFallback, TaskEstimateSection } from "@/components/task-estimate-section";
import { Button, ButtonLink, Field, FormCard, Input } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OPEN } from "@/lib/tasks";

export const metadata: Metadata = { title: "Create New Task" };

export default function NewTaskPage() {
  return (
    <FormCard title="Add Task">
      <ActionForm action={createTask}>
        <Field label="Name *" htmlFor="name">
          <Input id="name" name="name" maxLength={25} required />
        </Field>
        <Field label="Start Date *" htmlFor="startDate">
          <DatePicker id="startDate" name="startDate" required />
        </Field>
        <Field label="Estimated End Date *" htmlFor="estEndDate">
          <DatePicker id="estEndDate" name="estEndDate" required />
        </Field>
        <Suspense fallback={<EstimateFieldsFallback />}>
          <EstimateFields />
        </Suspense>
        <div className="grid gap-2 pt-2">
          <Button type="submit">Create New Task</Button>
          <ButtonLink href="/tasks" variant="secondary">
            Go Back
          </ButtonLink>
        </div>
      </ActionForm>
      <Suspense>
        <DemoTasksButton />
      </Suspense>
    </FormCard>
  );
}

/** Tags, hours and range, with a hint from the user's completed tasks. */
async function EstimateFields() {
  const user = await requireUser();
  return <TaskEstimateSection userId={user.id} />;
}

/** Offered only to users with no open tasks, as in the original. */
async function DemoTasksButton() {
  const user = await requireUser();
  const openCount = await prisma.task.count({ where: { ...OPEN, userId: user.id } });
  if (openCount > 0) return null;
  return (
    <form action={createDemoTasks} className="mt-6 border-t border-line pt-6">
      <Button variant="ghost" className="w-full">
        Create Demo Tasks
      </Button>
    </form>
  );
}
