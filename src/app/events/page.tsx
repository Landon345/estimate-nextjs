import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { approveEvent, deleteEvent, setEventResult } from "@/app/actions/events";
import { DateRangeFilter, param, readDateRange } from "@/components/date-range-filter";
import { Badge, Button, ButtonLink, EmptyState, LoadingRows, PageHeader, Section, Select, Table, Td } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Events" };

type SearchParams = PageProps<"/events">["searchParams"];

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <>
      <PageHeader title="Events">
        <ButtonLink href="/events/new">Suggest New Event</ButtonLink>
      </PageHeader>
      <Suspense fallback={<LoadingRows />}>
        <EventLists searchParams={searchParams} />
      </Suspense>
      <p className="mt-10 text-sm text-muted">
        Looking for the original{" "}
        <Link href="/estimation" className="font-medium text-brand underline">
          estimation calibration
        </Link>
        ?
      </p>
    </>
  );
}

async function EventLists({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const range = readDateRange(params);
  const categoryId = Number(param(params, "category")) || null;

  const filter: Prisma.EventWhereInput = {
    eventDate: { gte: range.start ?? undefined, lte: range.end ?? undefined },
    ...(categoryId ? { categoryId } : {}),
  };
  const include = { category: { select: { name: true } }, suggestor: { select: { username: true } } };
  const orderBy: Prisma.EventOrderByWithRelationInput[] = [{ eventDate: "asc" }, { name: "asc" }];

  const [categories, approved, suggested] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.event.findMany({ where: { ...filter, isApproved: true }, include, orderBy }),
    prisma.event.findMany({
      // Admins review everyone's suggestions; other users see their own.
      where: { ...filter, isApproved: false, ...(user.isAdmin ? {} : { suggestorId: user.id }) },
      include,
      orderBy,
    }),
  ]);

  return (
    <>
      <DateRangeFilter basePath="/events" range={range}>
        <label className="min-w-40 flex-1 space-y-1 text-sm font-medium">
          <span>Category</span>
          <Select name="category" defaultValue={categoryId ?? ""}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
      </DateRangeFilter>

      <Section title="Approved Events">
        {approved.length === 0 ? (
          <EmptyState>No approved events to display.</EmptyState>
        ) : (
          <Table head={["Event date", "Category", "Name", "Description", "Result", ...(user.isAdmin ? [""] : [])]}>
            {approved.map((event) => (
              <tr key={event.id}>
                <Td className="whitespace-nowrap">{formatLongDate(event.eventDate)}</Td>
                <Td>{event.category?.name ?? "none"}</Td>
                <Td className="font-medium">{event.name}</Td>
                <Td className="text-muted">{event.description}</Td>
                <Td>
                  <ResultBadge result={event.result} />
                </Td>
                {user.isAdmin && (
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      <ActionButton action={setEventResult.bind(null, event.id, true)} variant="success">
                        Happened
                      </ActionButton>
                      <ActionButton action={setEventResult.bind(null, event.id, false)} variant="warning">
                        Did Not Happen
                      </ActionButton>
                      <ActionButton action={deleteEvent.bind(null, event.id)} variant="danger">
                        Delete
                      </ActionButton>
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={user.isAdmin ? "All Suggested Events" : "Your Suggested Events"}>
        {suggested.length === 0 ? (
          <EmptyState>No suggested events to display.</EmptyState>
        ) : (
          <Table head={["Event date", "Category", "Name", "Description", ...(user.isAdmin ? ["Suggested by"] : []), ""]}>
            {suggested.map((event) => (
              <tr key={event.id}>
                <Td className="whitespace-nowrap">{formatLongDate(event.eventDate)}</Td>
                <Td>{event.category?.name ?? "none"}</Td>
                <Td className="font-medium">{event.name}</Td>
                <Td className="text-muted">{event.description}</Td>
                {user.isAdmin && <Td>{event.suggestor?.username ?? "—"}</Td>}
                <Td>
                  <div className="flex justify-end gap-1.5">
                    {user.isAdmin && (
                      <ActionButton action={approveEvent.bind(null, event.id)} variant="success">
                        Approve
                      </ActionButton>
                    )}
                    <ButtonLink href={`/events/${event.id}/edit`} variant="warning" size="sm">
                      Edit
                    </ButtonLink>
                    <ActionButton action={deleteEvent.bind(null, event.id)} variant="danger">
                      {user.isAdmin ? "Deny" : "Delete"}
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}

function ActionButton({
  action,
  variant,
  children,
}: {
  action: () => Promise<void>;
  variant: "success" | "warning" | "danger";
  children: string;
}) {
  return (
    <form action={action}>
      <Button variant={variant} size="sm">
        {children}
      </Button>
    </form>
  );
}

function ResultBadge({ result }: { result: boolean | null }) {
  if (result === null) return <Badge>Pending</Badge>;
  return result ? <Badge tone="success">Happened</Badge> : <Badge tone="warning">Did not happen</Badge>;
}
