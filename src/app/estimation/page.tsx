import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, EmptyState, LoadingRows, PageHeader, Table, Td } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Calibration" };

export default function EstimationPage() {
  return (
    <>
      <PageHeader title="Estimation Calibration" />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-muted">
        Practise estimating: predict how likely each event is, then compare with what actually happened.
      </p>
      <Suspense fallback={<LoadingRows />}>
        <CategoryList />
      </Suspense>
    </>
  );
}

async function CategoryList() {
  const user = await requireUser();
  const [categories, pendingSuggestions] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { exercises: { where: { outcomeReported: false } } } } },
    }),
    user.isAdmin ? prisma.suggestion.count() : 0,
  ]);

  return (
    <>
      {user.isAdmin && (
        <div className="mb-4">
          <ButtonLink href="/estimation/suggestions" variant="secondary">
            View Suggestions ({pendingSuggestions})
          </ButtonLink>
        </div>
      )}
      {categories.length === 0 ? (
        <EmptyState>No categories yet.</EmptyState>
      ) : (
        <Table head={["Category", "Description", "Open exercises", ""]}>
          {categories.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-muted">{c.description}</Td>
              <Td className="tabular-nums">{c._count.exercises}</Td>
              <Td>
                <div className="flex justify-end gap-2">
                  <ButtonLink href={`/estimation/${c.id}`} size="sm">
                    View Exercises
                  </ButtonLink>
                  <ButtonLink href={`/estimation/${c.id}/suggest`} variant="secondary" size="sm">
                    Suggest Exercise
                  </ButtonLink>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
