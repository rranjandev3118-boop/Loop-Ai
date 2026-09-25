import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { generateReportContent } from "@/lib/ai/report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? "20") || 20));
    const where = { workspaceId: user.workspaceId, deletedAt: null };
    const [items, total] = await Promise.all([
      db.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { author: { select: { id: true, name: true, email: true } } }
      }),
      db.report.count({ where })
    ]);
    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to load reports" : "Access denied" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const payload = z.object({
      title: z.string().trim().min(3).max(120).default("Voice of Customer Report"),
      period: z.enum(["weekly", "monthly"]).default("weekly"),
      periodStart: z.coerce.date().optional(),
      periodEnd: z.coerce.date().optional()
    }).parse(await request.json().catch(() => ({})));
    if ((payload.periodStart && !payload.periodEnd) || (!payload.periodStart && payload.periodEnd)) {
      return NextResponse.json({ error: "periodStart and periodEnd must be provided together" }, { status: 400 });
    }
    const days = payload.period === "monthly" ? 30 : 7;
    const periodEnd = new Date();
    const resolvedPeriodEnd = payload.periodEnd ?? periodEnd;
    const periodStart = payload.periodStart ?? new Date(resolvedPeriodEnd.getTime() - days * 24 * 60 * 60 * 1000);
    if (periodStart >= resolvedPeriodEnd) {
      return NextResponse.json({ error: "periodStart must be before periodEnd" }, { status: 400 });
    }
    const feedback = await db.feedback.findMany({
      where: { workspaceId: user.workspaceId, deletedAt: null, createdAt: { gte: periodStart, lte: resolvedPeriodEnd } },
      include: { themes: { include: { theme: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000
    });
    const themeCounts = new Map<string, number>();
    for (const item of feedback) for (const link of item.themes) themeCounts.set(link.theme.name, (themeCounts.get(link.theme.name) ?? 0) + 1);
    const topThemes = Array.from(themeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
    const negative = feedback.filter((item) => item.sentiment === "NEG").length;
    const positive = feedback.filter((item) => item.sentiment === "POS").length;
    const quotes = feedback.slice(0, 3).map((item) => item.content);
    const contentJson = await generateReportContent({
      periodLabel: payload.period,
      feedbackCount: feedback.length,
      topThemes,
      sentimentShift: `${positive} positive / ${negative} negative`,
      quotes
    });
    const report = await db.report.create({
      data: {
        title: payload.title,
        periodStart,
        periodEnd: resolvedPeriodEnd,
        workspaceId: user.workspaceId,
        generatedBy: user.id,
        contentJson: { ...contentJson, feedbackCount: feedback.length, sentimentShift: `${positive} positive / ${negative} negative` }
      }
    });
    await db.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Report",
        entityId: report.id,
        action: "REPORT_GENERATED",
        newValue: { period: payload.period, title: payload.title }
      }
    });
    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Report generation failed" : "Access denied" }, { status });
  }
}
