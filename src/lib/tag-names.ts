// Tag-name rules, shared by the tag picker in the browser and the server actions.

export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 30;

/** "  Lab   Reports " → "lab reports". Empty when nothing usable is left. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_TAG_LENGTH);
}

export function normalizeTags(raw: string[]): string[] {
  return [...new Set(raw.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS);
}
