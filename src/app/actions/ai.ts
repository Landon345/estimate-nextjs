"use server";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { daysBetween, parseDateInput, today } from "@/lib/dates";
import { aiEnabled } from "@/lib/ai";
import { calibrate, originalEstimate, toOutcome, totalHours } from "@/lib/estimation";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/tag-names";
import { HISTORY_INCLUDE } from "@/lib/tasks";

const MODEL = "claude-opus-5-5";
/** Most recent completed tasks sent as context; plenty to spot patterns, cheap to send. */
const HISTORY_LIMIT = 40;
const COOLDOWN_MS = 5_000;

export type EstimateSuggestion = {
  estimatedHours: number;
  lowHours: number;
  highHours: number;
  rationale: string;
};

export type SuggestResult = { suggestion: EstimateSuggestion } | { error: string };

const SuggestionSchema = z.object({
  estimatedHours: z.number().int(),
  lowHours: z.number().int(),
  highHours: z.number().int(),
  rationale: z.string(),
});

const SYSTEM = `You help one person estimate how many hours a task will take, using their own track record.

You get the new task and a list of tasks they have completed, each with the original estimate and what it actually took. Look for completed tasks similar to the new one (by name and tags) and for how this person's estimates usually compare with reality.

Return:
- estimatedHours: your best single estimate, a whole number of at least 1.
- lowHours and highHours: a range you are 80% confident contains the actual hours, with lowHours <= estimatedHours <= highHours.
- rationale: one or two short sentences for the person, naming the specific past tasks or pattern you relied on. If there is little or no relevant history, say so plainly and make the range wider.`;

// Per-process cooldown so a double click (or a loop) can't run up the API bill.
const lastCall = new Map<number, number>();

export async function suggestEstimate(input: {
  name: string;
  tags: string[];
  startDate?: string;
  estEndDate?: string;
}): Promise<SuggestResult> {
  const user = await requireUser();
  if (!aiEnabled()) return { error: "AI suggestions aren't set up. Add ANTHROPIC_API_KEY to .env." };

  const name = typeof input.name === "string" ? input.name.trim().slice(0, 25) : "";
  if (!name) return { error: "Enter a task name first, so there's something to estimate." };
  const tags = normalizeTags(Array.isArray(input.tags) ? input.tags.filter((t) => typeof t === "string") : []);
  const startDate = parseDateInput(input.startDate);
  const estEndDate = parseDateInput(input.estEndDate);

  const now = Date.now();
  if (now - (lastCall.get(user.id) ?? 0) < COOLDOWN_MS) return { error: "One moment, please try again in a few seconds." };
  lastCall.set(user.id, now);

  const history = await prisma.task.findMany({
    where: { userId: user.id, completed: true, dropped: false },
    include: HISTORY_INCLUDE,
    orderBy: { actualEndDate: "desc" },
    take: HISTORY_LIMIT,
  });
  const overall = calibrate(history.map(toOutcome));

  const lines = history.map((task) => {
    const original = originalEstimate(task);
    const range = original.lowHours !== null ? ` (range ${original.lowHours}-${original.highHours}h)` : "";
    const tagText = task.tags.length ? ` [${task.tags.map((t) => t.name).join(", ")}]` : "";
    const plannedDays = daysBetween(task.startDate, original.estEndDate) + 1;
    const actualDays = daysBetween(task.startDate, task.actualEndDate ?? today()) + 1;
    return `- "${task.name}"${tagText}: estimated ${original.estimatedHours}h${range}, took ${totalHours(task.hours)}h; planned ${plannedDays} days, took ${actualDays} days`;
  });

  const newTask = [
    `Name: "${name}"`,
    tags.length ? `Tags: ${tags.join(", ")}` : "Tags: none",
    startDate && estEndDate ? `Planned window: ${daysBetween(startDate, estEndDate) + 1} days` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const summary =
    overall.hoursFactor !== null
      ? `Across these tasks the median of actual ÷ estimated hours is ${overall.hoursFactor}.`
      : "There isn't enough history yet for a reliable overall pattern.";

  const prompt = `New task:\n${newTask}\n\nCompleted tasks (most recent first):\n${
    lines.length ? lines.join("\n") : "(none yet)"
  }\n\n${summary}`;

  try {
    const response = await new Anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Falls back to another model server-side if a safety classifier declines.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(SuggestionSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") return { error: "Claude declined to suggest an estimate for this task." };
    const parsed = response.parsed_output;
    if (!parsed) return { error: "Claude's answer couldn't be read. Please try again." };

    // Don't trust the model to keep its own numbers consistent.
    const estimatedHours = Math.max(1, parsed.estimatedHours);
    return {
      suggestion: {
        estimatedHours,
        lowHours: Math.max(1, Math.min(parsed.lowHours, estimatedHours)),
        highHours: Math.max(parsed.highHours, estimatedHours),
        rationale: parsed.rationale.trim(),
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { error: "The Anthropic API key was rejected." };
    if (error instanceof Anthropic.RateLimitError) return { error: "Too many requests to Claude right now. Try again shortly." };
    if (error instanceof Anthropic.APIError) {
      console.error("suggestEstimate:", error.status, error.message);
      return { error: "Claude couldn't be reached. Please try again." };
    }
    throw error;
  }
}
