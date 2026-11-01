import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Cached on globalThis so dev-mode module reloads reuse one pool instead of
// opening a new one on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * ENVIRONMENT=PRODUCTION uses the hosted database (CLOUD_DATABASE_URL, the pooled
 * Prisma Postgres string); anything else uses DATABASE_URL, the local one.
 */
function databaseUrl(): string {
  const production = process.env.ENVIRONMENT?.toUpperCase() === "PRODUCTION";
  const url = production ? (process.env.CLOUD_DATABASE_URL ?? process.env.DATABASE_URL) : process.env.DATABASE_URL;
  if (!url) throw new Error(production ? "Set CLOUD_DATABASE_URL for ENVIRONMENT=PRODUCTION." : "Set DATABASE_URL in .env.");
  return url;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: databaseUrl() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
