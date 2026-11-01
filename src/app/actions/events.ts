"use server";

import { requireAdmin, requireUser, type CurrentUser } from "@/lib/auth";
import { parseDateInput, today } from "@/lib/dates";
import { finish, integer, refreshAll, text, type FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

async function readEventForm(formData: FormData) {
  const name = text(formData, "name");
  const description = text(formData, "description");
  const categoryId = integer(formData, "categoryId");
  const eventDate = parseDateInput(formData.get("eventDate"));

  const errors: string[] = [];
  if (!name) errors.push("Event must have a name.");
  else if (name.length > 50) errors.push("Name cannot contain more than 50 characters.");
  if (!description) errors.push("Event must have a description.");
  else if (description.length > 500) errors.push("Description cannot contain more than 500 characters.");
  if (Number.isNaN(categoryId) || !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    errors.push("Category must be included.");
  }
  if (!eventDate) errors.push("Date must be included.");
  else if (eventDate <= today()) errors.push("Event date must be after today.");

  return { errors, data: { name, description, categoryId, eventDate: eventDate! } };
}

/** Admins can change any event; a suggestor only their own, until it's approved. */
async function findEditableEvent(user: CurrentUser, eventId: number) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;
  if (user.isAdmin) return event;
  return event.suggestorId === user.id && !event.isApproved ? event : null;
}

export async function suggestEvent(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { errors, data } = await readEventForm(formData);
  if (errors.length > 0) return { errors };

  await prisma.event.create({ data: { ...data, suggestorId: user.id } });
  finish("/events", "Event suggested. An admin will review it.");
}

export async function updateEvent(eventId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const event = await findEditableEvent(user, eventId);
  if (!event) return { errors: ["Event does not exist or can no longer be edited."] };

  const { errors, data } = await readEventForm(formData);
  if (errors.length > 0) return { errors };

  await prisma.event.update({ where: { id: event.id }, data });
  finish("/events", "Event updated.");
}

export async function deleteEvent(eventId: number): Promise<void> {
  const user = await requireUser();
  const event = await findEditableEvent(user, eventId);
  if (!event) return;
  await prisma.event.delete({ where: { id: event.id } });
  refreshAll();
}

export async function approveEvent(eventId: number): Promise<void> {
  await requireAdmin();
  await prisma.event.updateMany({ where: { id: eventId }, data: { isApproved: true } });
  refreshAll();
}

export async function setEventResult(eventId: number, happened: boolean): Promise<void> {
  await requireAdmin();
  await prisma.event.updateMany({ where: { id: eventId, isApproved: true }, data: { result: happened } });
  refreshAll();
}
