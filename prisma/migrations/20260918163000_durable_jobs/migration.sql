-- Durable, provider-neutral work queue for AI and report/PDF processing.
CREATE TYPE "JobType" AS ENUM ('CLASSIFICATION', 'REPORT_GENERATION', 'PDF_EXPORT');
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "workspaceId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");
CREATE INDEX "Job_status_availableAt_createdAt_idx" ON "Job"("status", "availableAt", "createdAt");
CREATE INDEX "Job_workspaceId_status_createdAt_idx" ON "Job"("workspaceId", "status", "createdAt");
CREATE INDEX "Job_lockedAt_idx" ON "Job"("lockedAt");

ALTER TABLE "Job" ADD CONSTRAINT "Job_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
