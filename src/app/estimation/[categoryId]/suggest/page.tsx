import type { Metadata } from "next";
import { Suspense } from "react";
import { suggestExercise } from "@/app/actions/calibration";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Field, FormCard, Input, LoadingRows, Textarea } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Suggest Exercise" };

type Props = PageProps<"/estimation/[categoryId]/suggest">;

export default function SuggestExercisePage({ params }: Props) {
  return (
    <FormCard title="Suggest Exercise">
      <Suspense fallback={<LoadingRows rows={2} />}>
        <SuggestForm params={params} />
      </Suspense>
    </FormCard>
  );
}

async function SuggestForm({ params }: { params: Props["params"] }) {
  await requireUser();
  const id = Number((await params).categoryId);
  const category = Number.isInteger(id) ? await prisma.category.findUnique({ where: { id } }) : null;
  if (!category) return <p className="text-center">Category does not exist.</p>;

  return (
    <ActionForm action={suggestExercise.bind(null, category.id)}>
      <p className="text-center text-sm text-muted">Category: {category.name}</p>
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" maxLength={128} required />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} maxLength={2048} required />
      </Field>
      <div className="grid gap-2 pt-2">
        <Button type="submit">Submit Suggestion</Button>
        <ButtonLink href={`/estimation/${category.id}`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
