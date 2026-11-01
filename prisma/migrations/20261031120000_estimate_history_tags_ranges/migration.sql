-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "highHours" INTEGER,
ADD COLUMN     "lowHours" INTEGER;

-- CreateTable
CREATE TABLE "EstimateRevision" (
    "id" SERIAL NOT NULL,
    "estimatedHours" INTEGER NOT NULL,
    "lowHours" INTEGER,
    "highHours" INTEGER,
    "estEndDate" DATE NOT NULL,
    "reason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" INTEGER NOT NULL,

    CONSTRAINT "EstimateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TagToTask" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TagToTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "EstimateRevision_taskId_idx" ON "EstimateRevision"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "_TagToTask_B_index" ON "_TagToTask"("B");

-- AddForeignKey
ALTER TABLE "EstimateRevision" ADD CONSTRAINT "EstimateRevision_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing tasks get their current estimate as the original one.
INSERT INTO "EstimateRevision" ("estimatedHours", "estEndDate", "createdAt", "taskId")
SELECT "estimatedHours", "estEndDate", "startDate", "id" FROM "Task";

-- CHECK constraints Prisma can't express: a range must bracket the estimate.
ALTER TABLE "Task" ADD CONSTRAINT "Task_hours_range_check"
  CHECK ("lowHours" IS NULL OR "highHours" IS NULL OR ("lowHours" <= "estimatedHours" AND "estimatedHours" <= "highHours"));
