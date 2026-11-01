import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMEMBER_ME_DAYS = 30;

export type RoleName = "admin" | "manager" | "moderator" | "basicUser";

export type CurrentUser = {
  id: number;
  username: string;
  roles: string[];
  isAdmin: boolean;
};

/** Session tokens are random and high-entropy, so a fast hash is enough. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a session row and set its cookie. Without "remember me" the cookie
 * dies with the browser and the row expires after a day.
 */
export async function startSession(userId: number, rememberMe: boolean): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const days = rememberMe ? REMEMBER_ME_DAYS : 1;
  const expiresAt = new Date(Date.now() + days * DAY_MS);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { expires: expiresAt } : {}),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, username: true, roles: { select: { name: true } } } },
    },
  });
  if (!session || session.expiresAt <= new Date()) return null;

  const roles = session.user.roles.map((r) => r.name);
  return {
    id: session.user.id,
    username: session.user.username,
    roles,
    isAdmin: roles.includes("admin"),
  };
});

/** For pages and actions that need a signed-in user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For admin-only pages and actions; everyone else is sent home. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

/** Password rules carried over from UserAccount.validatePassword. */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (!password) return ["Password field cannot be empty."];
  if (password.length < 10) errors.push("Password must contain at least 10 characters.");
  else if (password.length > 60) errors.push("Password cannot contain more than 60 characters.");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter.");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number.");
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special ("!, @, #, $, %, ^, &, *") character.');
  }
  return errors;
}
