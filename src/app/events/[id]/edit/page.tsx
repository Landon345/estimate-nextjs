import type { Metadata } from "next";
import { Suspense } from "react";
import { updateEvent } from "@/app/actions/events";
import { ActionForm } from "@/components/action-form";
import { EventFields } from "@/components/event-fields";
import { Button, ButtonLink, FormCard, LoadingRows } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Event" };

export default function EditEventPage({ params }: PageProps<"/events/[id]/edit">) {
  return (
    <FormCard title="Edit Event">
      <Suspense fallback={<LoadingRows rows={3} />}>
        <EditEventForm params={params} />
      </Suspense>
    </FormCard>
  );
}

async function EditEventForm({ params }: { params: PageProps<"/events/[id]/edit">["params"] }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const [event, categories] = await Promise.all([
    Number.isInteger(id) ? prisma.event.findUnique({ where: { id } }) : null,
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const canEdit = event && (user.isAdmin || (event.suggestorId === user.id && !event.isApproved));
  if (!canEdit) {
    return (
      <div className="space-y-4 text-center">
        <p>This event does not exist or can no longer be edited.</p>
        <ButtonLink href="/events" variant="secondary">
          Back to Events
        </ButtonLink>
      </div>
    );
  }

  return (
    <ActionForm action={updateEvent.bind(null, event.id)}>
      <EventFields categories={categories} event={event} />
      <div className="grid gap-2 pt-2">
        <Button type="submit">Save Changes</Button>
        <ButtonLink href="/events" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
