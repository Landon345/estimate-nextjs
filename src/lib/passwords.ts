import { randomInt } from "node:crypto";

// No look-alikes (0/O, 1/l/I), so a password can be typed from the screen.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
// The special characters validatePassword accepts.
const SPECIAL = "!@#$%^&*";

const pick = (chars: string) => chars[randomInt(chars.length)];

/**
 * A random password that always passes validatePassword (one of each character
 * class). Used for admin resets and by prisma/create-admin.ts, so it has no
 * server-only import.
 */
export function generatePassword(length = 18): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
