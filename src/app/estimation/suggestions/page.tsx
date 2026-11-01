import type { Metadata } from "next";
import { Suspense } from "react";
import { approveSuggestion, denySuggestion } from "@/app/actions/calibration";
import { Button, ButtonLink, EmptyState, LoadingRows, PageHeader, Table, Td } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Exercise Suggestions" };

export default function SuggestionsPage() {
  return (
    <>
      <PageHeader title="Exercise Suggestions">
        <ButtonLink href="/estimation" variant="secondary">
          Back to Calibration
        </ButtonLink>
      </PageHeader>
      <Suspense fallback={<LoadingRows />}>
        <SuggestionTable />
      </Suspense>
    </>
  );
}

async function SuggestionTable() {
  await requireAdmin();
  const suggestions = await prisma.suggestion.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { id: "asc" },
  });

  if (suggestions.length === 0) return <EmptyState>No suggestions waiting for review.</EmptyState>;

  return (
    <Table head={["Category", "Name", "Description", ""]}>
      {suggestions.map((s) => (
        <tr key={s.id}>
          <Td>{s.category.name}</Td>
          <Td className="font-medium">{s.name}</Td>
          <Td className="text-muted">{s.description}</Td>
          <Td>
            <div className="flex justify-end gap-1.5">
              <form action={approveSuggestion.bind(null, s.id)}>
                <Button variant="success" size="sm">
                  Approve
                </Button>
              </form>
              <form action={denySuggestion.bind(null, s.id)}>
                <Button variant="danger" size="sm">
                  Deny
                </Button>
              </form>
            </div>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
