import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** What a form's server action returns when it doesn't redirect. */
export type FormState = { errors: string[] } | undefined;

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Parses a whole number; NaN for anything else (including "", "1.5", "abc"). */
export function integer(formData: FormData, key: string): number {
  const value = text(formData, key);
  return /^-?\d+$/.test(value) ? Number(value) : NaN;
}

/** Like `integer`, but null when the field is blank. */
export function optionalInteger(formData: FormData, key: string): number | null {
  return text(formData, key) === "" ? null : integer(formData, key);
}

/**
 * Finish a successful mutation: refresh every route's data and send the user
 * on to `path`, with a one-time notice shown at the top of the page.
 */
export function finish(path: string, notice?: string): never {
  revalidatePath("/", "layout");
  if (!notice) redirect(path);
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}notice=${encodeURIComponent(notice)}`);
}

/** Refresh every route's data without navigating away. */
export function refreshAll(): void {
  revalidatePath("/", "layout");
}
