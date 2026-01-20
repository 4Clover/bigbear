/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `BlockedDate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "JobStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "JobStatus" ADD VALUE 'PAID';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTANT';

-- AlterTable
ALTER TABLE "BlockedDate" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceJob" ADD COLUMN     "assignedWorkerId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "scheduledTime" TEXT;

-- AlterTable
ALTER TABLE "WorkCompletion" ADD COLUMN     "finalAmount" DECIMAL(10,2),
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "unexpectedIssues" TEXT;

-- AlterTable
ALTER TABLE "WorkerProfile" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "trustworthiness" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_externalId_key" ON "BlockedDate"("externalId");

-- AddForeignKey
ALTER TABLE "MaintenanceJob" ADD CONSTRAINT "MaintenanceJob_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "WorkerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
