"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { endSession, hashPassword, startSession, validatePassword, verifyPassword } from "@/lib/auth";
import { finish, text, type FormState } from "@/lib/forms";

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const username = text(formData, "username");
  const password = formData.get("password");
  const rememberMe = formData.get("rememberMe") === "on";

  const user =
    username && typeof password === "string"
      ? await prisma.user.findUnique({ where: { username }, select: { id: true, passwordHash: true } })
      : null;
  if (!user || !(await verifyPassword(password as string, user.passwordHash))) {
    return { errors: ["Invalid username or password."] };
  }

  await startSession(user.id, rememberMe);
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

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
