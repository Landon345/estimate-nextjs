"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  endOtherSessions,
  endSession,
  hashPassword,
  requireSession,
  startSession,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";
import { finish, text, type FormState } from "@/lib/forms";

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const username = text(formData, "username");
  const password = formData.get("password");
  const rememberMe = formData.get("rememberMe") === "on";

  const user =
    username && typeof password === "string"
      ? await prisma.user.findUnique({
          where: { username },
          select: { id: true, passwordHash: true, mustChangePassword: true },
        })
      : null;
  if (!user || !(await verifyPassword(password as string, user.passwordHash))) {
    return { errors: ["Invalid username or password."] };
  }

  await startSession(user.id, rememberMe);
  if (user.mustChangePassword) finish("/account", "Your password was reset. Choose a new one to continue.");
  finish("/");
}

export async function createAccount(_state: FormState, formData: FormData): Promise<FormState> {
  const username = text(formData, "username");
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";

  const errors: string[] = [];
  if (!username) errors.push("Username field cannot be empty.");
  else if (username.length > 50) errors.push("Username field cannot be greater than 50 characters.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) errors.push("Username must be a valid email address.");
  errors.push(...validatePassword(password));

  if (errors.length === 0 && (await prisma.user.findUnique({ where: { username } }))) {
    errors.push("That username is already taken.");
  }
  if (errors.length > 0) return { errors };

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      roles: { connect: { name: "basicUser" } },
    },
  });

  await startSession(user.id, true);
  finish("/", "Account created and logged in successfully.");
}

/** Change your own password; also how a temporary password from an admin reset gets replaced. */
export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSession();
  const field = (key: string) => (typeof formData.get(key) === "string" ? (formData.get(key) as string) : "");
  const current = field("currentPassword");
  const next = field("newPassword");

  const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!current || !(await verifyPassword(current, passwordHash))) {
    return { errors: [`${user.mustChangePassword ? "Temporary" : "Current"} password is incorrect.`] };
  }
  const errors = validatePassword(next);
  if (next !== field("confirmPassword")) errors.push("The new passwords don't match.");
  if (errors.length === 0 && next === current) errors.push("Choose a password different from the current one.");
  if (errors.length > 0) return { errors };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  await endOtherSessions(user.id);
  finish("/", "Password changed. Other devices have been signed out.");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
