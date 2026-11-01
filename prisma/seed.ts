// Seeds what the Tapestry app created at startup (CayenneUserAccountDatabaseService
// and EstimationCategoryFactory), plus sample tasks and events so every page
// has something to show. Safe to re-run: it upserts by unique name and only
// adds sample tasks/events to accounts that have none. SEED_DEMO=0 seeds only
// roles and categories, without the demo accounts (used for the cloud DB).

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
const day = (offset: number) => new Date(todayUtc + offset * DAY_MS);

const ROLES = ["admin", "manager", "moderator", "basicUser"];

// The original seeded these with "pass1234"; it doesn't meet the app's own
// password rules, but it is kept so the familiar logins still work.
const USERS = [
  { username: "JohnDoe", roles: ["basicUser"] },
  { username: "JamesDoe", roles: ["basicUser"] },
  { username: "JaneDoe", roles: ["admin", "manager"] },
];
const DEFAULT_PASSWORD = "pass1234";

const CATEGORIES = [
  {
    name: "Sports",
    description: "Predict the outcome of sports games from around the world",
    exercises: [
      ["NDSU football 12/16", "Will NDSU win the semi-finals game on 12/16/2022?"],
      ["Vikings 12/18", "Will the vikings win on 12/18/2022?"],
      ["World cup USA", "Will USA win the world cup?"],
    ],
  },
  {
    name: "Elections",
    description: "Predict the outcome of elections from around the world",
    exercises: [
      ["USA Presidency", "Will the local boy-Fred become President of the United States?"],
      ["Argentina Secretary of State", "Will Joe Smith become the Secretary of State?"],
      ["Fargo City Council", "Will group F become the city council?"],
    ],
  },
  {
    name: "Movies",
    description: "Predict the outcome of various new movies.",
    exercises: [
      ["Avatar 2 Grossing", "Will Avatar 2 Gross more $ than the first Avatar?"],
      ["Spider-Man: Beyond the Spider-Verse ratings", "Will the newest Spiderman achieve a 90%+ rating on Rotten Tomatoes?"],
      ["Cocaine Bear", "Will Cocaine Bear become the best picture for 2023?"],
    ],
  },
];

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const categories: Record<string, number> = {};
  for (const { name, description, exercises } of CATEGORIES) {
    const category = await prisma.category.upsert({ where: { name }, update: {}, create: { name, description } });
    categories[name] = category.id;
    if ((await prisma.exercise.count({ where: { categoryId: category.id } })) === 0) {
      await prisma.exercise.createMany({
        data: exercises.map(([exName, exDescription]) => ({
          name: exName,
          description: exDescription,
          categoryId: category.id,
        })),
      });
    }
  }

  if (process.env.SEED_DEMO === "0") {
    console.log("Seeded roles and categories (no demo accounts).");
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const users: Record<string, number> = {};
  for (const { username, roles } of USERS) {
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username, passwordHash, roles: { connect: roles.map((name) => ({ name })) } },
    });
    users[username] = user.id;
  }

  await seedTasks(users.JohnDoe);
  await seedEvents(users, categories);
}

type SeedTask = {
  name: string;
  tags: string[];
  start: number;
  estEnd: number;
  end?: number;
  completed?: boolean;
  willNotComplete?: boolean;
  estimatedHours: number;
  range?: [number, number];
  /** Set when the task was re-estimated: what it started as, and why it changed. */
  original?: { estimatedHours: number; estEnd: number; reason: string };
  logged: [number, number][];
};

/**
 * A mix of open and closed tasks for JohnDoe, so reports and the history hint
 * have data: coding work tends to run about 40% over, writing closer to plan.
 */
async function seedTasks(userId: number) {
  if ((await prisma.task.count({ where: { userId } })) > 0) return;

  const tasks: SeedTask[] = [
    // Open
    { name: "Gadgetron 1050X", tags: ["coding"], start: -20, estEnd: 4, estimatedHours: 30, range: [24, 40], logged: [[-18, 3], [-12, 5], [-3, 4]] },
    { name: "WizBang 2020", tags: ["coding"], start: -10, estEnd: 12, estimatedHours: 45, logged: [[-9, 2], [-1, 6]] },
    { name: "Fantabulator 4055", tags: ["writing"], start: -5, estEnd: 25, estimatedHours: 20, logged: [] },
    // Closed: actual end set, finishing early, late and on time
    { name: "Thingamabopper 30", tags: ["coding"], start: -40, estEnd: -20, end: -24, completed: true, estimatedHours: 25, range: [20, 30], logged: [[-38, 6], [-30, 8], [-27, 9], [-25, 7]] },
    {
      name: "Gadgetron 4000", tags: ["coding"], start: -35, estEnd: -15, end: -8, completed: true, estimatedHours: 40,
      original: { estimatedHours: 30, estEnd: -18, reason: "The vendor API changed halfway through" },
      logged: [[-33, 7], [-25, 9], [-20, 8], [-14, 12], [-10, 10]],
    },
    { name: "Sprint demo", tags: ["coding"], start: -26, estEnd: -19, end: -17, completed: true, estimatedHours: 12, range: [10, 14], logged: [[-24, 8], [-18, 9]] },
    { name: "WizBang 5050Z", tags: ["writing"], start: -28, estEnd: -14, end: -14, completed: true, estimatedHours: 18, range: [15, 22], logged: [[-27, 4], [-20, 6], [-16, 5]] },
    { name: "Lab report 2", tags: ["writing"], start: -22, estEnd: -18, end: -16, completed: true, estimatedHours: 6, range: [5, 8], logged: [[-21, 4], [-17, 5]] },
    { name: "Lab report 3", tags: ["writing"], start: -12, estEnd: -7, end: -7, completed: true, estimatedHours: 8, range: [6, 10], logged: [[-11, 5], [-8, 4]] },
    { name: "Fantabulator 1075", tags: ["coding"], start: -30, estEnd: -10, end: -12, willNotComplete: true, estimatedHours: 15, logged: [[-29, 3]] },
  ];

  for (const t of tasks) {
    const current = {
      estimatedHours: t.estimatedHours,
      lowHours: t.range?.[0] ?? null,
      highHours: t.range?.[1] ?? null,
      estEndDate: day(t.estEnd),
    };
    const revisions = t.original
      ? [
          { estimatedHours: t.original.estimatedHours, estEndDate: day(t.original.estEnd), createdAt: day(t.start) },
          { ...current, reason: t.original.reason, createdAt: day(t.original.estEnd) },
        ]
      : [{ ...current, createdAt: day(t.start) }];

    await prisma.task.create({
      data: {
        name: t.name,
        startDate: day(t.start),
        ...current,
        actualEndDate: t.end !== undefined ? day(t.end) : null,
        completed: t.completed ?? false,
        willNotComplete: t.willNotComplete ?? false,
        userId,
        hours: { create: t.logged.map(([offset, hours]) => ({ date: day(offset), hoursLogged: hours })) },
        tags: {
          connectOrCreate: t.tags.map((name) => ({
            where: { userId_name: { userId, name } },
            create: { name, userId },
          })),
        },
        revisions: { create: revisions },
      },
    });
  }
}

async function seedEvents(users: Record<string, number>, categories: Record<string, number>) {
  if ((await prisma.event.count()) > 0) return;
  await prisma.event.createMany({
    data: [
      { name: "Bison home opener", description: "Will NDSU win its home opener?", eventDate: day(14), isApproved: true, categoryId: categories.Sports, suggestorId: users.JaneDoe },
      { name: "City council vote", description: "Will the new park levy pass?", eventDate: day(30), isApproved: true, categoryId: categories.Elections, suggestorId: users.JamesDoe },
      { name: "Summer blockbuster", description: "Will it open above $100M?", eventDate: day(45), isApproved: false, categoryId: categories.Movies, suggestorId: users.JohnDoe },
      { name: "Vikings playoffs", description: "Will the Vikings make the playoffs?", eventDate: day(60), isApproved: false, categoryId: categories.Sports, suggestorId: users.JamesDoe },
    ],
  });
}

main()
  .then(() => console.log("Seeded."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
