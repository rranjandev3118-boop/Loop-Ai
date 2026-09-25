import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { classifyAndPersist } from "@/lib/classification";
import { enqueueClassificationJob, runNextJob } from "@/lib/jobs";
import { z } from "zod";
import { feedbackActionSchema, feedbackCreateSchema, feedbackQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const query = feedbackQuerySchema.parse(params);
    const where = {
      workspaceId: user.workspaceId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.sentiment ? { sentiment: query.sentiment } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.themeId ? { themes: { some: { themeId: query.themeId } } } : {}),
      ...(query.dateFrom || query.dateTo ? {
        createdAt: {
          ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
          ...(query.dateTo ? {
            lt: new Date(new Date(`${query.dateTo}T00:00:00.000Z`).getTime() + 86400000)
          } : {})
        }
      } : {}),
      ...(query.q ? { content: { contains: query.q, mode: "insensitive" as const } } : {})
    };
    const [items, total] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { themes: { include: { theme: true } } }
      }),
      db.feedback.count({ where })
    ]);
    return NextResponse.json({ items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Invalid feedback query" : "Access denied" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const payload = feedbackCreateSchema.parse(await req.json());
    const row = await db.feedback.create({
      data: {
        content: payload.content,
        channel: payload.channel,
        customerLabel: payload.customerLabel,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        workspaceId: user.workspaceId
      }
    });
    await enqueueClassificationJob({ feedbackId: row.id, workspaceId: user.workspaceId });
    await runNextJob(`request:${user.id}`, async (job) => {
      const payload = job.payload as { feedbackId?: string };
      if (!payload.feedbackId) throw new Error("CLASSIFICATION_JOB_PAYLOAD_INVALID");
      await classifyAndPersist(payload.feedbackId, user.workspaceId);
    });
    const saved = await db.feedback.findFirst({ where: { id: row.id, workspaceId: user.workspaceId, deletedAt: null }, include: { themes: { include: { theme: true } } } });
    return NextResponse.json({ feedback: saved, processing: !saved?.sentiment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Invalid feedback payload" : "Access denied" }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const payload = feedbackActionSchema.parse(await req.json());
    
    const feedback = await db.feedback.findFirst({
      where: { id: payload.id, workspaceId: user.workspaceId, deletedAt: null },
      select: { id: true, status: true }
    });
    if (!feedback) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    
    const nextStatus = payload.status!;
    const allowedNextStatus = { NEW: "REVIEWED", REVIEWED: "ACTIONED", ACTIONED: null }[feedback.status];
    if (allowedNextStatus !== nextStatus) {
      return NextResponse.json({ error: `Feedback must move from ${feedback.status} to ${allowedNextStatus ?? "remain actioned"}` }, { status: 409 });
    }
    const updated = await db.feedback.updateMany({
      where: { id: feedback.id, workspaceId: user.workspaceId, deletedAt: null },
      data: { status: nextStatus }
    });
    if (!updated.count) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    const result = await db.feedback.findFirst({
      where: { id: feedback.id, workspaceId: user.workspaceId, deletedAt: null },
      select: { id: true, status: true }
    });
    return NextResponse.json({ success: true, feedback: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    if (message !== "FORBIDDEN" && message !== "UNAUTHENTICATED" && message !== "NOT_FOUND") {
      console.error("Feedback action failed", error);
    }
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : message === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: status === 400 ? "Feedback action failed" : status === 404 ? "Feedback not found" : "Access denied" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const payload = z.object({ id: z.string().min(1) }).parse(await req.json());
    const deletedAt = new Date();
    const result = await db.feedback.updateMany({
      where: { id: payload.id, workspaceId: user.workspaceId, deletedAt: null },
      data: { deletedAt }
    });
    if (!result.count) return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    await db.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Feedback",
        entityId: payload.id,
        action: "DELETE",
        newValue: { deletedAt: deletedAt.toISOString() }
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete feedback";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to delete feedback" : "Access denied" }, { status });
  }
}
