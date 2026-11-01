# EstiMate (Next.js)

A port of the CS 413 `estimate` app (Tapestry 5 + Cayenne + Shiro on Derby) to
**Next.js 16 · TypeScript · Tailwind CSS v4 · Prisma 7 · PostgreSQL**, managed with **pnpm**.

Track tasks against an estimated end date and hours budget, log hours, close tasks,
and see monthly reports of how your estimates compared with reality. Users also
suggest events for admins to approve, and practise calibration by predicting the
outcome of exercises.

## Getting started

```bash
pnpm install                     # also runs prisma generate
cp .env.example .env             # then set DATABASE_URL
createdb -U postgres estimate    # or create the database however you like
pnpm db:migrate                  # applies prisma/migrations
pnpm db:seed                     # roles, demo users, categories, sample data
pnpm dev
```

To turn on AI estimate suggestions, add `ANTHROPIC_API_KEY` to `.env`. Without
it the button is hidden and everything else works.

Seeded logins (password `pass1234` for all, as in the original):

| User | Roles |
| --- | --- |
| `JaneDoe` | admin, manager |
| `JohnDoe` | basicUser, with sample tasks, hours and closed tasks |
| `JamesDoe` | basicUser |

New accounts must use an email address and a password meeting the original
rules (10+ chars, upper, lower, digit, one of `!@#$%^&*`).

## Scripts

| Script | |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` / `lint` | `tsc --noEmit` / ESLint |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:seed` | `prisma db seed` (safe to re-run) |
| `pnpm db:reset` | drop, re-migrate and re-seed |

## Layout

```
prisma/schema.prisma        data model (from datamap.map.xml)
prisma/seed.ts              startup data the Java services created
src/proxy.ts                redirects signed-out visitors to /login
src/lib/auth.ts             cookie sessions (DB-backed), bcrypt, role checks
src/lib/estimation.ts       report math, plus the history factors (shared with the browser)
src/app/actions/*.ts        server actions (all mutations, each re-checks auth)
src/app/actions/ai.ts       "Suggest an estimate" (Claude, structured output)
src/components/ui/          shadcn/ui Popover + Calendar, restyled to the app's tokens
src/components/date-picker.tsx  shadcn date picker that posts yyyy-mm-dd like a date input
src/app/**/page.tsx         pages; dynamic parts stream in behind <Suspense>
```

## Learning from your estimates

Additions beyond the original app:

- **Estimate history.** Every task keeps its original estimate. Re-estimating
  (hours, range or end date, with an optional reason) adds a revision instead of
  overwriting it. The task's Hours page shows the history, and reports measure
  against the original, so a late re-estimate can't hide a miss.
- **Tags.** Each user has their own tags (`coding`, `writing`, …). Filter the task
  board by tag; the hint below uses them.
- **History hint** on the add/edit task form: from your completed tasks, the median
  of actual ÷ estimated hours and of actual ÷ planned days ("work usually takes
  1.3× your estimate, so 10h likely means about 13h", with a button to use it).
  It narrows to tasks sharing the selected tags once there are at least 3.
- **80% range estimates.** An optional low–high range. The hint reports how often
  your ranges caught the real hours; well-calibrated ranges should hit about 80%.
- **AI estimate suggestion** (needs `ANTHROPIC_API_KEY`). Sends the new task's name
  and tags, plus your 40 most recent completed tasks (name, tags, estimate, actual)
  to Claude, which returns an estimate, a range and a one-line rationale.
- **Date pickers** are shadcn/ui (Radix Popover + react-day-picker) everywhere a
  date is chosen. The report's month selector is still a native month input.

`cacheComponents` is on, so every page prerenders a static shell and streams the
session-dependent content into it.

## Page map

| Tapestry page | Route |
| --- | --- |
| Index, Login, CreateAccount, Logout | `/`, `/login`, `/create-account`, header button |
| tasks/Index, AddTask, EditTask | `/tasks`, `/tasks/new`, `/tasks/[id]/edit` |
| tasks/ViewCompletedTasks | `/tasks/completed` |
| hours/Index, AddHours, EditHours | `/tasks/[id]/hours`, `…/hours/new`, `…/hours/[hourId]/edit` |
| reports/Index + ViewReport | `/reports?month=YYYY-MM` |
| events/Index, Add, Edit | `/events`, `/events/new`, `/events/[id]/edit` |
| categories/Index, Add | `/categories`, `/categories/new` (admin) |
| estimation/* | `/estimation`, `/estimation/[categoryId]`, `…/suggest`, `/estimation/exercises/[id]`, `/estimation/suggestions` (admin) |

## Behaviour changes from the Java app

Deliberate fixes, so the two versions won't match exactly:

- **Closing a task records its actual end date.** The original never set it, so
  reports always measured against today.
- **Reports include closed tasks.** The original queried only open tasks, so every
  row was "In Progress".
- **The "you tend to be X% over/under confident" hint** is replaced by the history
  hint above. The original computed it from open tasks with no end date.
- **Editing a task can change its hours estimate**, recorded as a revision. The
  original allowed only the name and end date.
- **Task-name uniqueness is enforced** per user among open tasks. The original
  check never ran for new tasks.
- **Deadline alerts** show only your own tasks due within 7 days, not everyone's.
- **Demo tasks** come only from the "Create Demo Tasks" button, dated around
  today. The original also added 5 random tasks on every new session.
- **An exact estimate counts as neutral** in the confidence tendency (it counted
  as over confident).
- **Passwords use bcrypt** instead of salted SHA-512. Sessions are DB-backed cookies.
- **Exercise/suggestion → category** is a single foreign key rather than a join
  table, since only one category was ever used.

Not ported: `oldreports`, `users/EditUsers` and `users/MyAccount` (no templates,
so unreachable in the original), and the unused `EstimateTask` regression stub.
