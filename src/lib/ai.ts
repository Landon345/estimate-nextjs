import "server-only";

/** The "Suggest an estimate" button only appears once an API key is configured. */
export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
