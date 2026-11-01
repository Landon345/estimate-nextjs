// Runs a Prisma CLI command against the cloud database (CLOUD_DATABASE_URL in
// .env) instead of the local one. Used by the db:cloud:* scripts:
//   pnpm db:cloud:status | db:cloud:deploy | db:cloud:seed [--demo]
// Migrations go over the direct host (db.prisma.io); the pooled host can't hold
// the session they need. Set CLOUD_DIRECT_URL to override the derived address.
// The seed skips the demo accounts (shared "pass1234" logins, one an admin)
// unless --demo is passed. Never prints the connection strings.
import { spawnSync } from "node:child_process";

const pooled = process.env.CLOUD_DATABASE_URL;
if (!pooled) {
  console.error("CLOUD_DATABASE_URL isn't set in .env.");
  process.exit(1);
}
const url = new URL(pooled);
if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  console.error("CLOUD_DATABASE_URL points at this computer, not a cloud database.");
  process.exit(1);
}

let direct = process.env.CLOUD_DIRECT_URL;
if (!direct) {
  const directUrl = new URL(pooled);
  directUrl.hostname = directUrl.hostname.replace(/^pooled\./, "");
  direct = directUrl.toString();
}

const args = process.argv.slice(2);
const demo = args.includes("--demo");
const prismaArgs = args.filter((arg) => arg !== "--demo");

console.log(`Running "prisma ${prismaArgs.join(" ")}" against the cloud database at ${url.hostname}.`);
const result = spawnSync(["pnpm", "exec", "prisma", ...prismaArgs].join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: pooled, DIRECT_URL: direct, SEED_DEMO: demo ? "1" : "0" },
});
process.exit(result.status ?? 1);
