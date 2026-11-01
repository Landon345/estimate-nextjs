"use server";

import { requireUser } from "@/lib/auth";
import { addDays, parseDateInput, today } from "@/lib/dates";
import { finish, integer, optionalInteger, refreshAll, text, type FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/tag-names";
import { ensureTags, findTaskFor, isDuplicateOpenTaskName } from "@/lib/tasks";

const MAX_NAME = 25;
const MAX_REASON = 200;
const EARLIEST = new Date(Date.UTC(1900, 0, 1));

function validateName(name: string): string[] {
  if (!name) return ["Task name cannot be empty."];
  if (name.length > MAX_NAME) return [`Name cannot contain more than ${MAX_NAME} characters.`];
  return [];
}

/** The hours estimate, its optional range and the tags, as the task form sends them. */
function readEstimate(formData: FormData, errors: string[]) {
  const estimatedHours = integer(formData, "estimatedHours");
  const lowHours = optionalInteger(formData, "lowHours");
  const highHours = optionalInteger(formData, "highHours");

  if (Number.isNaN(estimatedHours)) errors.push("Estimated Hours must be a whole number.");
  else if (estimatedHours <= 0) errors.push("Estimated Hours must be more than 0.");

  if ((lowHours === null) !== (highHours === null)) {
    errors.push("Give both ends of the range, or leave both blank.");
  } else if (lowHours !== null && highHours !== null) {
    if (Number.isNaN(lowHours) || Number.isNaN(highHours)) errors.push("Range hours must be whole numbers.");
    else if (lowHours <= 0) errors.push("The range must start above 0 hours.");
    else if (!Number.isNaN(estimatedHours) && !(lowHours <= estimatedHours && estimatedHours <= highHours)) {
      errors.push("The range must include the estimated hours.");
    }
  }

  const tags = normalizeTags(formData.getAll("tags").filter((t): t is string => typeof t === "string"));
  return { estimatedHours, lowHours, highHours, tags };
}

export async function createTask(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(formData, "name");
  const startDate = parseDateInput(formData.get("startDate"));
  const estEndDate = parseDateInput(formData.get("estEndDate"));

  const errors = validateName(name);
  const { estimatedHours, lowHours, highHours, tags } = readEstimate(formData, errors);
  if (!startDate || !estEndDate) {
    errors.push("Start date and estimated end date are required.");
  } else if (startDate < EARLIEST || estEndDate < EARLIEST) {
    errors.push("Dates cannot be before 1/1/1900.");
  } else if (estEndDate < startDate) {
    errors.push("Estimated end date must be after start date.");
  }
  if (errors.length === 0 && (await isDuplicateOpenTaskName(user.id, name))) {
    errors.push("Task names must be unique.");
  }
  if (errors.length > 0) return { errors };

  const estimate = { estimatedHours, lowHours, highHours, estEndDate: estEndDate! };
  await prisma.task.create({
    data: {
      name,
      startDate: startDate!,
      ...estimate,
      userId: user.id,
      tags: { connect: await ensureTags(user.id, tags) },
      // The first revision is the original estimate, kept even if the task is re-estimated.
      revisions: { create: estimate },
    },
  });
  finish("/tasks", "Task added successfully.");
}

/**
 * Unlike EditTask, the hours estimate can change too. Any change to the
 * estimate is recorded as a revision, so the original is never lost.
 */
export async function updateTask(taskId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const task = await findTaskFor(user, taskId);
  if (!task) return { errors: ["Task does not exist."] };

  const name = text(formData, "name");
  const estEndDate = parseDateInput(formData.get("estEndDate"));
  const reason = text(formData, "reason").slice(0, MAX_REASON);

  const errors = validateName(name);
  const { estimatedHours, lowHours, highHours, tags } = readEstimate(formData, errors);
  if (!estEndDate) errors.push("Estimated end date is required.");
  else if (estEndDate < task.startDate) errors.push("Estimated end date must be after start date.");
  if (errors.length === 0 && (await isDuplicateOpenTaskName(task.userId, name, task.id))) {
    errors.push("Task names must be unique.");
  }
  if (errors.length > 0) return { errors };

  const estimate = { estimatedHours, lowHours, highHours, estEndDate: estEndDate! };
  const reestimated =
    estimatedHours !== task.estimatedHours ||
    lowHours !== task.lowHours ||
    highHours !== task.highHours ||
    estimate.estEndDate.getTime() !== task.estEndDate.getTime();

  await prisma.task.update({
    where: { id: task.id },
    data: {
      name,
      ...estimate,
      tags: { set: await ensureTags(task.userId, tags) },
      ...(reestimated ? { revisions: { create: { ...estimate, reason: reason || null } } } : {}),
    },
  });
  finish("/tasks", reestimated ? "Task re-estimated. The original estimate is kept in its history." : "Task updated successfully.");
}

const CLOSE_REASONS = {
  completed: "Completed",
  dropped: "Dropped",
  willNotComplete: "Will Not Complete",
  canNotComplete: "Can Not Complete",
} as const;

export type CloseReason = keyof typeof CLOSE_REASONS;

/**
 * Close a task. Unlike the Tapestry version this also stamps the actual end
 * date, which the reports and the estimate-tendency hint are measured against.
 */
export async function closeTask(taskId: number, reason: CloseReason): Promise<void> {
  const user = await requireUser();
  const task = await findTaskFor(user, taskId);
  if (!task || !(reason in CLOSE_REASONS)) return;

  await prisma.task.update({
    where: { id: task.id },
    data: { [reason]: true, actualEndDate: today() },
  });
  finish("/tasks", `"${task.name}" closed as ${CLOSE_REASONS[reason]}.`);
}

/** Quick Log Hours on a task card: always logged against today. */
export async function logHoursToday(taskId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const task = await findTaskFor(user, taskId);
  if (!task) return { errors: ["Task does not exist."] };

  const hours = integer(formData, "hours");
  const errors = validateHours(hours);
  if (errors.length > 0) return { errors };

  await prisma.hourLog.create({ data: { taskId: task.id, hoursLogged: hours, date: today() } });
  refreshAll();
  return undefined;
}

function validateHours(hours: number): string[] {
  if (Number.isNaN(hours)) return ["Hours must be a whole number."];
  if (hours <= 0) return ["Hours must be greater than zero."];
  if (hours > 24) return ["You cannot log more than 24 hours for a single day."];
  return [];
}

function validateHourLog(formData: FormData) {
  const hours = integer(formData, "hoursLogged");
  const date = parseDateInput(formData.get("date"));
  const errors = validateHours(hours);
  if (!date) errors.push("Date must be included.");
  else if (date > today()) errors.push("Date must be today or earlier.");
  return { hours, date, errors };
}

export async function addHours(taskId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const task = await findTaskFor(user, taskId);
  if (!task) return { errors: ["Task does not exist."] };

  const { hours, date, errors } = validateHourLog(formData);
  if (errors.length > 0) return { errors };

  await prisma.hourLog.create({ data: { taskId: task.id, hoursLogged: hours, date: date! } });
  finish(`/tasks/${task.id}/hours`, "Hours added successfully.");
}

export async function updateHours(hourId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const log = await prisma.hourLog.findUnique({ where: { id: hourId } });
  const task = log && (await findTaskFor(user, log.taskId));
  if (!log || !task) return { errors: ["Hour record does not exist."] };

  const { hours, date, errors } = validateHourLog(formData);
  if (errors.length > 0) return { errors };

  await prisma.hourLog.update({ where: { id: log.id }, data: { hoursLogged: hours, date: date! } });
  finish(`/tasks/${task.id}/hours`, "Hours edited successfully.");
}

export async function deleteHours(hourId: number): Promise<void> {
  const user = await requireUser();
  const log = await prisma.hourLog.findUnique({ where: { id: hourId } });
  if (!log || !(await findTaskFor(user, log.taskId))) return;

  await prisma.hourLog.delete({ where: { id: log.id } });
  refreshAll();
}

// ─── Demo data (the "Create Demo Tasks" button) ──────────────────────────────

const NAMES_1 = ["Gadgetron", "Thingamabopper", "WizBang", "Fantabulator"];
const NAMES_2 = ["10", "20", "30", "40", "50"];
const NAMES_3 = ["00", "20", "50", "55", "75", "00X", "50X", "50Z"];

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Five open tasks with some logged hours, dated around today so they show up
 * immediately (the Java factory used fixed 2023 dates).
 */
export async function createDemoTasks(): Promise<void> {
  const user = await requireUser();
  const now = today();

  for (let i = 0; i < 5; i++) {
    const startDate = addDays(now, -randomInt(5, 40));
    const endDate = addDays(now, randomInt(-3, 30));
    const estimate = { estEndDate: endDate < startDate ? startDate : endDate, estimatedHours: randomInt(10, 60) };
    await prisma.task.create({
      data: {
        name: `${pick(NAMES_1)} ${pick(NAMES_2)}${pick(NAMES_3)}`,
        startDate,
        ...estimate,
        revisions: { create: estimate },
        userId: user.id,
        hours: {
          create: Array.from({ length: randomInt(1, 4) }, () => ({
            hoursLogged: randomInt(1, 6),
            date: addDays(now, -randomInt(0, 4)),
          })),
        },
      },
    });
  }
  finish("/tasks", "Demo tasks created.");
}
