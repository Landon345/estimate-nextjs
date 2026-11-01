import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { toOutcome, type TaskOutcome } from "@/lib/estimation";
import { prisma } from "@/lib/prisma";

/** Not closed in any way: the tasks shown on the main Tasks page. */
export const OPEN: Prisma.TaskWhereInput = {
  completed: false,
  dropped: false,
  willNotComplete: false,
  canNotComplete: false,
};

/** Finished, or deliberately not finished: what View Completed Tasks lists. */
export const FINISHED: Prisma.TaskWhereInput = {
  OR: [{ completed: true }, { willNotComplete: true }],
  dropped: false,
  canNotComplete: false,
};

export const CAN_NOT_COMPLETE: Prisma.TaskWhereInput = { canNotComplete: true, dropped: false };

/** A task the user may view or change: their own, or anyone's for an admin. */
export async function findTaskFor(user: CurrentUser, taskId: number) {
  if (!Number.isInteger(taskId)) return null;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || (task.userId !== user.id && !user.isAdmin)) return null;
  return task;
}

/** What `toOutcome` needs to judge a task against its original estimate. */
export const HISTORY_INCLUDE = {
  hours: { select: { hoursLogged: true } },
  tags: { select: { name: true }, orderBy: { name: "asc" } },
  revisions: { orderBy: { id: "asc" } },
} satisfies Prisma.TaskInclude;

/**
 * How the user's completed tasks turned out. Dropped and abandoned tasks are
 * left out: they say little about how long finishing something takes.
 */
export async function loadOutcomes(userId: number): Promise<TaskOutcome[]> {
  const tasks = await prisma.task.findMany({
    where: { userId, completed: true, dropped: false },
    include: HISTORY_INCLUDE,
  });
  return tasks.map(toOutcome);
}

export async function userTagNames(userId: number): Promise<string[]> {
  const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { name: true } });
  return tags.map((t) => t.name);
}

/** Find or create the user's tags by (already normalized) name. */
export async function ensureTags(userId: number, names: string[]): Promise<{ id: number }[]> {
  if (names.length === 0) return [];
  await prisma.tag.createMany({ data: names.map((name) => ({ name, userId })), skipDuplicates: true });
  return prisma.tag.findMany({ where: { userId, name: { in: names } }, select: { id: true } });
}

/** True when the user already has another open task with this name. */
export async function isDuplicateOpenTaskName(userId: number, name: string, excludeTaskId?: number) {
  const existing = await prisma.task.findFirst({
    where: {
      ...OPEN,
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeTaskId ? { id: { not: excludeTaskId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}
