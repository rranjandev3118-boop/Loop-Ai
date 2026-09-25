import { db } from "@/lib/db";
import { JobStatus, JobType, Prisma } from "@prisma/client";

export type JobPayload = Record<string, unknown>;
export type DurableJob = Prisma.JobGetPayload<{}>;

const DEFAULT_MAX_ATTEMPTS = 3;
const LEASE_MS = 5 * 60 * 1000;

export function enqueueClassificationJob(input: {
  workspaceId: string;
  feedbackId: string;
}): Promise<DurableJob> {
  return enqueueJob({
    type: JobType.CLASSIFICATION,
    workspaceId: input.workspaceId,
    payload: { feedbackId: input.feedbackId },
    idempotencyKey: `classification:${input.workspaceId}:${input.feedbackId}`
  });
}

export function enqueueReportGenerationJob(input: {
  workspaceId: string;
  requestedById: string;
  title: string;
  period: "weekly" | "monthly";
  requestId: string;
}): Promise<DurableJob> {
  return enqueueJob({
    type: JobType.REPORT_GENERATION,
    workspaceId: input.workspaceId,
    payload: { requestedById: input.requestedById, title: input.title, period: input.period },
    idempotencyKey: `report:${input.workspaceId}:${input.requestId}`
  });
}

export function enqueuePdfExportJob(input: {
  workspaceId: string;
  reportId: string;
  requestedById: string;
  exportId: string;
}): Promise<DurableJob> {
  return enqueueJob({
    type: JobType.PDF_EXPORT,
    workspaceId: input.workspaceId,
    payload: { reportId: input.reportId, requestedById: input.requestedById, exportId: input.exportId },
    idempotencyKey: `pdf:${input.exportId}`
  });
}

export async function enqueueJob(input: {
  type: JobType;
  workspaceId: string;
  payload: JobPayload;
  idempotencyKey?: string;
  maxAttempts?: number;
  availableAt?: Date;
}): Promise<DurableJob> {
  const data = {
    type: input.type,
    workspaceId: input.workspaceId,
    payload: input.payload as Prisma.InputJsonValue,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    availableAt: input.availableAt ?? new Date(),
    idempotencyKey: input.idempotencyKey
  };

  if (!input.idempotencyKey) return db.job.create({ data });
  return db.job.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: data,
    update: {}
  });
}

/**
 * Claims one job atomically. Expired leases are made available again so a
 * crashed worker cannot leave work stuck in RUNNING forever.
 */
export async function claimNextJob(workerId: string, now = new Date()): Promise<DurableJob | null> {
  const staleBefore = new Date(now.getTime() - LEASE_MS);
  return db.$transaction(async (tx) => {
    const candidates = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "Job"
      WHERE (
        ("status" = 'QUEUED' AND "availableAt" <= ${now})
        OR ("status" = 'RUNNING' AND "lockedAt" < ${staleBefore})
      )
      AND "attempts" < "maxAttempts"
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    const candidate = candidates[0];
    if (!candidate) return null;
    return tx.job.update({
      where: { id: candidate.id },
      data: {
        status: JobStatus.RUNNING,
        attempts: { increment: 1 },
        lockedAt: now,
        lockedBy: workerId,
        lastError: null
      }
    });
  });
}

export async function completeJob(id: string, workerId: string): Promise<DurableJob> {
  const result = await db.job.updateMany({
    where: { id, status: JobStatus.RUNNING, lockedBy: workerId },
    data: { status: JobStatus.COMPLETED, completedAt: new Date(), lockedAt: null, lockedBy: null }
  });
  if (!result.count) throw new Error("JOB_NOT_OWNED");
  return db.job.findUniqueOrThrow({ where: { id } });
}

export async function failJob(id: string, workerId: string, error: unknown): Promise<DurableJob> {
  const message = error instanceof Error ? error.message : String(error);
  const job = await db.job.findFirst({ where: { id, status: JobStatus.RUNNING, lockedBy: workerId } });
  if (!job) throw new Error("JOB_NOT_OWNED");
  const retry = job.attempts < job.maxAttempts;
  const delay = Math.min(60 * 60 * 1000, 2 ** Math.max(0, job.attempts - 1) * 1000);
  const result = await db.job.updateMany({
    where: { id: job.id, status: JobStatus.RUNNING, lockedBy: workerId },
    data: {
      status: retry ? JobStatus.QUEUED : JobStatus.FAILED,
      availableAt: retry ? new Date(Date.now() + delay) : job.availableAt,
      failedAt: retry ? null : new Date(),
      lastError: message.slice(0, 2000),
      lockedAt: null,
      lockedBy: null
    }
  });
  if (!result.count) throw new Error("JOB_NOT_OWNED");
  return db.job.findUniqueOrThrow({ where: { id: job.id } });
}

export async function runNextJob(
  workerId: string,
  handler: (job: DurableJob) => Promise<void>
): Promise<DurableJob | null> {
  const job = await claimNextJob(workerId);
  if (!job) return null;
  try {
    await handler(job);
    return await completeJob(job.id, workerId);
  } catch (error) {
    await failJob(job.id, workerId, error);
    return null;
  }
}
