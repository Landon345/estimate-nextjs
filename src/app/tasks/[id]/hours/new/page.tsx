import type { Metadata } from "next";
import { Suspense } from "react";
import { addHours } from "@/app/actions/tasks";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { Button, ButtonLink, Field, FormCard, Input, LoadingRows } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toDateInput, today } from "@/lib/dates";
import { findTaskFor } from "@/lib/tasks";

export const metadata: Metadata = { title: "Add Hours" };

export default function AddHoursPage({ params }: PageProps<"/tasks/[id]/hours/new">) {
  return (
    <FormCard title="Add Hours">
      <Suspense fallback={<LoadingRows rows={2} />}>
        <AddHoursForm params={params} />
      </Suspense>
    </FormCard>
  );
}

async function AddHoursForm({ params }: { params: PageProps<"/tasks/[id]/hours/new">["params"] }) {
  const user = await requireUser();
  const task = await findTaskFor(user, Number((await params).id));
  if (!task) return <p className="text-center">Task does not exist.</p>;

  return (
    <ActionForm action={addHours.bind(null, task.id)}>
      <p className="text-center text-sm text-muted">{task.name}</p>
      <Field label="Date" htmlFor="date">
        <DatePicker id="date" name="date" defaultValue={toDateInput(today())} max={toDateInput(today())} required />
      </Field>
      <Field label="Hours Logged" htmlFor="hoursLogged">
        <Input id="hoursLogged" name="hoursLogged" type="number" min={1} max={24} required />
      </Field>
      <div className="grid gap-2 pt-2">
        <Button type="submit">Add Hours</Button>
        <ButtonLink href={`/tasks/${task.id}/hours`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
