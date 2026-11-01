"use server";

import { hashPassword, requireAdmin } from "@/lib/auth";
import { refreshAll } from "@/lib/forms";
import { generatePassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

export type ResetState = { username: string; password: string } | { error: string } | undefined;

/**
 * Account recovery without email: an admin gives the user a temporary password,
 * which they must replace at their next login. Signs the user out everywhere.
 * The password is returned once for the admin to pass on, and never stored.
 */
export async function resetPassword(userId: number): Promise<ResetState> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { error: "Change your own password on the Account page." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (!user) return { error: "That user no longer exists." };

  const password = generatePassword(14);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password), mustChangePassword: true },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  refreshAll();
  return { username: user.username, password };
}
