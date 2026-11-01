// Creates an admin account, or resets an existing one's password, with a random
// password that meets the app's rules, and prints it once. Re-running it gives a
// new password and signs the account out everywhere.
//   pnpm db:cloud:admin [username]   (default username: Admin)

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generatePassword } from "../src/lib/passwords";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const ADMIN_ROLES = ["admin", "manager"];

async function main() {
  const username = process.argv[2]?.trim() || "Admin";
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const roles = ADMIN_ROLES.map((name) => ({ name }));

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, mustChangePassword: false, roles: { connect: roles } },
      }),
      prisma.session.deleteMany({ where: { userId: existing.id } }),
    ]);
  } else {
    await prisma.user.create({ data: { username, passwordHash, roles: { connect: roles } } });
  }

  console.log(`\n${existing ? "Reset" : "Created"} admin account.`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log("Save it in a password manager now; it isn't stored anywhere else.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
