import type { Metadata } from "next";
import { Suspense } from "react";
import { suggestEvent } from "@/app/actions/events";
import { ActionForm } from "@/components/action-form";
import { EventFields } from "@/components/event-fields";
import { Button, ButtonLink, FormCard, LoadingRows } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Suggest New Event" };

export default function NewEventPage() {
  return (
    <FormCard title="Suggest New Event">
      <Suspense fallback={<LoadingRows rows={3} />}>
        <SuggestEventForm />
      </Suspense>
    </FormCard>
  );
}

async function SuggestEventForm() {
  await requireUser();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <ActionForm action={suggestEvent}>
      <EventFields categories={categories} />
      <div className="grid gap-2 pt-2">
        <Button type="submit">Suggest New Event</Button>
        <ButtonLink href="/events" variant="secondary">
          Go Back
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
