import type { Metadata } from "next";
import { Suspense } from "react";
import { updateHours } from "@/app/actions/tasks";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { Button, ButtonLink, Field, FormCard, Input, LoadingRows } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toDateInput, today } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { findTaskFor } from "@/lib/tasks";

export const metadata: Metadata = { title: "Edit Hours" };

type Props = PageProps<"/tasks/[id]/hours/[hourId]/edit">;

export default function EditHoursPage({ params }: Props) {
  return (
    <FormCard title="Edit Hours">
      <Suspense fallback={<LoadingRows rows={2} />}>
        <EditHoursForm params={params} />
      </Suspense>
    </FormCard>
  );
}

async function EditHoursForm({ params }: { params: Props["params"] }) {
  const user = await requireUser();
  const { id, hourId } = await params;
  const task = await findTaskFor(user, Number(id));
  const log = task && Number.isInteger(Number(hourId))
    ? await prisma.hourLog.findFirst({ where: { id: Number(hourId), taskId: task.id } })
    : null;
  if (!task || !log) return <p className="text-center">Hour record does not exist.</p>;

  return (
    <ActionForm action={updateHours.bind(null, log.id)}>
      <p className="text-center text-sm text-muted">{task.name}</p>
      <Field label="Date" htmlFor="date">
        <DatePicker id="date" name="date" defaultValue={toDateInput(log.date)} max={toDateInput(today())} required />
      </Field>
      <Field label="Hours Logged" htmlFor="hoursLogged">
        <Input id="hoursLogged" name="hoursLogged" type="number" min={1} max={24} defaultValue={log.hoursLogged} required />
      </Field>
      <div className="grid gap-2 pt-2">
        <Button type="submit">Save Changes</Button>
        <ButtonLink href={`/tasks/${task.id}/hours`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
