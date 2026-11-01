import "server-only";

export type AiProvider = "gemini" | "claude";

export const AI_NAMES: Record<AiProvider, string> = { gemini: "Gemini", claude: "Claude" };

/**
 * Which model answers "Suggest an estimate", from the keys in .env. Gemini wins
 * when both are set, since its API has a free tier. Null hides the button.
 */
export function aiProvider(): AiProvider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}
