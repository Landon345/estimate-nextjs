import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI needs a direct connection; hosted Postgres (Prisma Postgres) gives
    // the app a pooled DATABASE_URL and a separate DIRECT_URL for migrations.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
