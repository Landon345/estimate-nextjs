import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { Badge, EmptyState, LoadingRows, PageHeader, Table, Td } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Forgotten passwords are reset here. The user gets a temporary password from you and picks a new one at their next
        login.
      </p>
      <Suspense fallback={<LoadingRows />}>
        <UserTable />
      </Suspense>
    </>
  );
}

async function UserTable() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true, createdAt: true, mustChangePassword: true, roles: { select: { name: true } } },
  });

  if (users.length === 0) return <EmptyState>No users yet.</EmptyState>;

  return (
    <Table head={["Username", "Roles", "Joined", ""]}>
      {users.map((user) => (
        <tr key={user.id}>
          <Td className="font-medium">
            <div className="flex flex-wrap items-center gap-2">
              {user.username}
              {user.mustChangePassword && <Badge tone="warning">temporary password</Badge>}
            </div>
          </Td>
          <Td>
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role.name} tone={role.name === "admin" ? "brand" : "neutral"}>
                  {role.name}
                </Badge>
              ))}
            </div>
          </Td>
          <Td className="whitespace-nowrap text-muted">{formatDate(user.createdAt)}</Td>
          <Td className="text-right">
            {user.id === admin.id ? (
              <Link href="/account" className="text-sm font-medium text-brand hover:underline">
                Your account
              </Link>
            ) : (
              <ResetPasswordButton userId={user.id} username={user.username} />
            )}
          </Td>
        </tr>
      ))}
    </Table>
  );
}
