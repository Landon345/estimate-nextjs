// Estimation accuracy math, ported from reports/ViewReport.java and
// tasks/AddTask.java#getUserTendency.

import { daysBetween, today } from "@/lib/dates";

export type TaskStatus = "Completed" | "Dropped" | "Will Not Complete" | "Can Not Complete" | "In Progress";

type TaskForReport = {
  name: string;
  startDate: Date;
  estEndDate: Date;
  actualEndDate: Date | null;
  completed: boolean;
  dropped: boolean;
  willNotComplete: boolean;
  canNotComplete: boolean;
  hours: { hoursLogged: number }[];
  /** Oldest first. When present, the first one is what the task is measured against. */
  revisions?: { estEndDate: Date }[];
};

export type ReportRow = {
  name: string;
  /** True when the task was re-estimated after it was created. */
  reestimated: boolean;
  estimatedDays: number;
  actualDays: number;
  status: TaskStatus;
  hoursLogged: number;
  /** Positive when the task finished ahead of its estimate. */
  netDays: number;
  /** 0–100: how close the estimate was to the actual duration. */
  accuracy: number;
  /** +accuracy when the estimate was too long, −accuracy when too short, 0 when exact. */
  tendency: number;
};

export type ReportSummary = {
  rows: ReportRow[];
  meanEstimated: number;
  meanActual: number;
  meanHoursLogged: number;
  meanNet: number;
  meanAccuracy: number;
  tendencyLabel: string;
};

export function taskStatus(task: Pick<TaskForReport, "completed" | "dropped" | "willNotComplete" | "canNotComplete">): TaskStatus {
  if (task.dropped) return "Dropped";
  if (task.completed) return "Completed";
  if (task.willNotComplete) return "Will Not Complete";
  if (task.canNotComplete) return "Can Not Complete";
  return "In Progress";
}

export function totalHours(hours: { hoursLogged: number }[]): number {
  return hours.reduce((sum, h) => sum + h.hoursLogged, 0);
}

function accuracyOf(estimatedDays: number, actualDays: number): number {
  if (actualDays === 0) return estimatedDays === 0 ? 100 : 0;
  const ratio = 1 - Math.abs(actualDays - estimatedDays) / actualDays;
  return round1(Math.max(0, ratio) * 100);
}

/**
 * Finishing early means the estimate was padded (under confident, positive);
 * finishing late means it was optimistic (over confident, negative). The Java
 * version counted an exact estimate as over confident; here it is neutral.
 */
function tendencyOf(estimatedDays: number, actualDays: number, accuracy: number): number {
  if (actualDays < estimatedDays) return accuracy;
  if (actualDays > estimatedDays) return -accuracy;
  return 0;
}

export function buildReportRow(task: TaskForReport): ReportRow {
  // Measured against the original estimate, so re-estimating can't hide a miss.
  const estimatedDays = daysBetween(task.startDate, task.revisions?.[0]?.estEndDate ?? task.estEndDate);
  // Open tasks are measured against today, as the original report did.
  const actualDays = daysBetween(task.startDate, task.actualEndDate ?? today());
  const accuracy = accuracyOf(estimatedDays, actualDays);
  return {
    name: task.name,
    reestimated: (task.revisions?.length ?? 0) > 1,
    estimatedDays,
    actualDays,
    status: taskStatus(task),
    hoursLogged: totalHours(task.hours),
    netDays: estimatedDays - actualDays,
    accuracy,
    tendency: tendencyOf(estimatedDays, actualDays, accuracy),
  };
}

export function summarize(tasks: TaskForReport[]): ReportSummary {
  const rows = tasks.map(buildReportRow);
  const meanTendency = mean(rows.map((r) => r.tendency));
  return {
    rows,
    meanEstimated: round1(mean(rows.map((r) => r.estimatedDays))),
    meanActual: round1(mean(rows.map((r) => r.actualDays))),
    meanHoursLogged: round1(mean(rows.map((r) => r.hoursLogged))),
    meanNet: round1(mean(rows.map((r) => r.netDays))),
    meanAccuracy: round1(mean(rows.map((r) => r.accuracy))),
    tendencyLabel: meanTendency >= 0 ? "Tends Under Confident" : "Tends Over Confident",
  };
}

// ─── Learning from history ───────────────────────────────────────────────────
// Everything below is plain data in, plain data out, so the task form can
// recompute the hint in the browser as the user picks tags.

type EstimateSnapshot = {
  estimatedHours: number;
  lowHours: number | null;
  highHours: number | null;
  estEndDate: Date;
};

type CompletedTask = EstimateSnapshot & {
  startDate: Date;
  actualEndDate: Date | null;
  hours: { hoursLogged: number }[];
  tags: { name: string }[];
  /** Oldest first. */
  revisions: EstimateSnapshot[];
};

/** How one completed task turned out against its original estimate. */
export type TaskOutcome = {
  tags: string[];
  /** Actual hours ÷ estimated hours; null when no hours were logged. */
  hoursRatio: number | null;
  /** Actual days ÷ planned days, counting both ends. */
  daysRatio: number;
  /** Whether the actual hours landed in the original range; null without a range. */
  inRange: boolean | null;
};

export type Calibration = {
  sampleSize: number;
  /** Median actual ÷ estimated hours. 1.3 means work usually takes 30% longer than estimated. */
  hoursFactor: number | null;
  /** Median actual ÷ planned days. */
  daysFactor: number | null;
  rangeHits: number;
  rangeTotal: number;
};

/** Fewer completed tasks than this and a factor would mostly be noise. */
export const MIN_SAMPLE = 3;

export function originalEstimate(task: EstimateSnapshot & { revisions: EstimateSnapshot[] }): EstimateSnapshot {
  return task.revisions[0] ?? task;
}

export function toOutcome(task: CompletedTask): TaskOutcome {
  const original = originalEstimate(task);
  const actualHours = totalHours(task.hours);
  const end = task.actualEndDate ?? today();
  const hasRange = original.lowHours !== null && original.highHours !== null;
  return {
    tags: task.tags.map((t) => t.name),
    hoursRatio: actualHours > 0 ? actualHours / original.estimatedHours : null,
    daysRatio: (daysBetween(task.startDate, end) + 1) / (daysBetween(task.startDate, original.estEndDate) + 1),
    inRange: hasRange ? original.lowHours! <= actualHours && actualHours <= original.highHours! : null,
  };
}

/** Medians rather than means, so one disaster task doesn't swamp the rest. */
export function calibrate(outcomes: TaskOutcome[]): Calibration {
  const hours = outcomes.flatMap((o) => (o.hoursRatio === null ? [] : [o.hoursRatio]));
  const ranged = outcomes.filter((o) => o.inRange !== null);
  return {
    sampleSize: outcomes.length,
    hoursFactor: hours.length >= MIN_SAMPLE ? round2(median(hours)) : null,
    daysFactor: outcomes.length >= MIN_SAMPLE ? round2(median(outcomes.map((o) => o.daysRatio))) : null,
    rangeHits: ranged.filter((o) => o.inRange).length,
    rangeTotal: ranged.length,
  };
}

/**
 * Calibration for the tags on a task being estimated: tasks sharing any of
 * them, if there are enough, otherwise everything.
 */
export function calibrateFor(outcomes: TaskOutcome[], tags: string[]): Calibration & { scope: string[] } {
  if (tags.length > 0) {
    const matching = outcomes.filter((o) => o.tags.some((t) => tags.includes(t)));
    if (matching.length >= MIN_SAMPLE) return { ...calibrate(matching), scope: tags };
  }
  return { ...calibrate(outcomes), scope: [] };
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
