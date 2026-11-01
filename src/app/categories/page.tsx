import type { Metadata } from "next";
import { Suspense } from "react";
import { deleteCategory } from "@/app/actions/calibration";
import { Button, ButtonLink, EmptyState, LoadingRows, PageHeader, Table, Td } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categories">
        <ButtonLink href="/categories/new">Create New Category</ButtonLink>
      </PageHeader>
      <Suspense fallback={<LoadingRows />}>
        <CategoryTable />
      </Suspense>
    </>
  );
}

async function CategoryTable() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true, exercises: true } } },
  });

  if (categories.length === 0) return <EmptyState>No categories yet.</EmptyState>;

  return (
    <Table head={["Name", "Description", "Events", "Exercises", ""]}>
      {categories.map((c) => (
        <tr key={c.id}>
          <Td className="font-medium">{c.name}</Td>
          <Td className="text-muted">{c.description}</Td>
          <Td className="tabular-nums">{c._count.events}</Td>
          <Td className="tabular-nums">{c._count.exercises}</Td>
          <Td className="text-right">
            <form action={deleteCategory.bind(null, c.id)}>
              <Button variant="danger" size="sm">
                Delete
              </Button>
            </form>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
