"use server";

import { requireAdmin, requireUser } from "@/lib/auth";
import { finish, integer, refreshAll, text, type FormState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

function validateNameAndDescription(name: string, description: string, maxName = 128): string[] {
  const errors: string[] = [];
  if (!name) errors.push("Name must be included.");
  else if (name.length > maxName) errors.push(`Name cannot contain more than ${maxName} characters.`);
  if (!description) errors.push("Description must be included.");
  else if (description.length > 2048) errors.push("Description cannot contain more than 2048 characters.");
  return errors;
}

// ─── Categories (admin) ──────────────────────────────────────────────────────

export async function createCategory(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = text(formData, "name");
  const description = text(formData, "description");

  const errors = validateNameAndDescription(name, description);
  if (errors.length === 0 && (await prisma.category.findUnique({ where: { name } }))) {
    errors.push("A category with that name already exists.");
  }
  if (errors.length > 0) return { errors };

  await prisma.category.create({ data: { name, description } });
  finish("/categories", "Category added successfully.");
}

/** Events in the category are kept (uncategorised); its exercises go with it. */
export async function deleteCategory(categoryId: number): Promise<void> {
  await requireAdmin();
  await prisma.category.deleteMany({ where: { id: categoryId } });
  refreshAll();
}

// ─── Calibration exercises ───────────────────────────────────────────────────

/** One prediction per user per exercise; predicting again replaces it. */
export async function submitEstimate(exerciseId: number, _state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise || exercise.outcomeReported) return { errors: ["This exercise is no longer open for predictions."] };

  const percent = integer(formData, "percentPrediction");
  if (Number.isNaN(percent) || percent < 0 || percent > 100) {
    return { errors: ["The prediction has to be between 0 and 100 percent!"] };
  }

  const existing = await prisma.estimate.findFirst({ where: { exerciseId, userId: user.id } });
  if (existing) {
    await prisma.estimate.update({ where: { id: existing.id }, data: { percentPrediction: percent } });
  } else {
    await prisma.estimate.create({ data: { exerciseId, userId: user.id, percentPrediction: percent } });
  }
  finish(`/estimation/${exercise.categoryId}`, "Prediction saved.");
}

export async function suggestExercise(categoryId: number, _state: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  if (!(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    return { errors: ["Category does not exist."] };
  }
  const name = text(formData, "name");
  const description = text(formData, "description");
  const errors = validateNameAndDescription(name, description);
  if (errors.length > 0) return { errors };

  await prisma.suggestion.create({ data: { name, description, categoryId } });
  finish(`/estimation/${categoryId}`, "Suggestion submitted for review.");
}

export async function approveSuggestion(suggestionId: number): Promise<void> {
  await requireAdmin();
  const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) return;
  await prisma.$transaction([
    prisma.exercise.create({
      data: { name: suggestion.name, description: suggestion.description, categoryId: suggestion.categoryId },
    }),
    prisma.suggestion.delete({ where: { id: suggestion.id } }),
  ]);
  refreshAll();
}

export async function denySuggestion(suggestionId: number): Promise<void> {
  await requireAdmin();
  await prisma.suggestion.deleteMany({ where: { id: suggestionId } });
  refreshAll();
}

export async function reportOutcome(exerciseId: number, occurred: boolean): Promise<void> {
  await requireAdmin();
  await prisma.exercise.updateMany({
    where: { id: exerciseId },
    data: { outcome: occurred, outcomeReported: true },
  });
  refreshAll();
}
