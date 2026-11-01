import type { Metadata } from "next";
import { Suspense } from "react";
import { reportOutcome } from "@/app/actions/calibration";
import { Badge, Button, ButtonLink, EmptyState, LoadingRows, PageHeader, Section, Table, Td } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Exercises" };

type Props = PageProps<"/estimation/[categoryId]">;

export default function ExercisesPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Exercises" />
          <LoadingRows />
        </>
      }
    >
      <Exercises params={params} />
    </Suspense>
  );
}

async function Exercises({ params }: { params: Props["params"] }) {
  const user = await requireUser();
  const id = Number((await params).categoryId);
  const category = Number.isInteger(id)
    ? await prisma.category.findUnique({
        where: { id },
        include: {
          exercises: {
            orderBy: { name: "asc" },
            include: { estimates: { where: { userId: user.id }, select: { percentPrediction: true } } },
          },
        },
      })
    : null;

  if (!category) {
    return (
      <>
        <PageHeader title="Exercises" />
        <EmptyState>Category does not exist.</EmptyState>
      </>
    );
  }

  const open = category.exercises.filter((e) => !e.outcomeReported);
  const resolved = category.exercises.filter((e) => e.outcomeReported);

  return (
    <>
      <PageHeader title={`${category.name} Exercises`}>
        <ButtonLink href={`/estimation/${category.id}/suggest`} variant="secondary">
          Suggest Exercise
        </ButtonLink>
        <ButtonLink href="/estimation" variant="secondary">
          All Categories
        </ButtonLink>
      </PageHeader>

      <Section title="Open">
        {open.length === 0 ? (
          <EmptyState>No open exercises in this category.</EmptyState>
        ) : (
          <Table head={["Exercise", "Description", "Your prediction", ""]}>
            {open.map((e) => (
              <tr key={e.id}>
                <Td className="font-medium">{e.name}</Td>
                <Td className="text-muted">{e.description}</Td>
                <Td className="tabular-nums">{e.estimates[0] ? `${e.estimates[0].percentPrediction}%` : "—"}</Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    <ButtonLink href={`/estimation/exercises/${e.id}`} size="sm">
                      {e.estimates[0] ? "Change Prediction" : "Predict Outcome"}
                    </ButtonLink>
                    {user.isAdmin && (
                      <>
                        <form action={reportOutcome.bind(null, e.id, true)}>
                          <Button variant="success" size="sm">
                            Did Occur
                          </Button>
                        </form>
                        <form action={reportOutcome.bind(null, e.id, false)}>
                          <Button variant="warning" size="sm">
                            Did Not Occur
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      {resolved.length > 0 && (
        <Section title="Resolved">
          <Table head={["Exercise", "Description", "Outcome", "Your prediction"]}>
            {resolved.map((e) => (
              <tr key={e.id}>
                <Td className="font-medium">{e.name}</Td>
                <Td className="text-muted">{e.description}</Td>
                <Td>
                  {e.outcome ? <Badge tone="success">Occurred</Badge> : <Badge tone="warning">Did not occur</Badge>}
                </Td>
                <Td className="tabular-nums">{e.estimates[0] ? `${e.estimates[0].percentPrediction}%` : "—"}</Td>
              </tr>
            ))}
          </Table>
        </Section>
      )}
    </>
  );
}
