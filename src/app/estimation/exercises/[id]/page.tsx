import type { Metadata } from "next";
import { Suspense } from "react";
import { submitEstimate } from "@/app/actions/calibration";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Field, FormCard, Input, LoadingRows } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Predict Outcome" };

type Props = PageProps<"/estimation/exercises/[id]">;

export default function PredictPage({ params }: Props) {
  return (
    <FormCard title="Predict Outcome">
      <Suspense fallback={<LoadingRows rows={2} />}>
        <PredictForm params={params} />
      </Suspense>
    </FormCard>
  );
}

async function PredictForm({ params }: { params: Props["params"] }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const exercise = Number.isInteger(id)
    ? await prisma.exercise.findUnique({
        where: { id },
        include: { estimates: { where: { userId: user.id }, select: { percentPrediction: true } } },
      })
    : null;

  if (!exercise || exercise.outcomeReported) {
    return <p className="text-center">This exercise is not open for predictions.</p>;
  }

  return (
    <ActionForm action={submitEstimate.bind(null, exercise.id)}>
      <div className="rounded-lg bg-brand-soft p-4">
        <p className="font-semibold">{exercise.name}</p>
        <p className="mt-1 text-sm text-muted">{exercise.description}</p>
      </div>
      <Field label="How likely is it to happen? (%)" htmlFor="percentPrediction">
        <Input
          id="percentPrediction"
          name="percentPrediction"
          type="number"
          min={0}
          max={100}
          defaultValue={exercise.estimates[0]?.percentPrediction}
          required
        />
      </Field>
      <div className="grid gap-2 pt-2">
        <Button type="submit">Submit Prediction</Button>
        <ButtonLink href={`/estimation/${exercise.categoryId}`} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
