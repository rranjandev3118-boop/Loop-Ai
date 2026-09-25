import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
});

export async function GET(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const where = { workspaceId: user.workspaceId, userId: user.id };
    const [items, total] = await Promise.all([
      db.questionHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      db.questionHistory.count({ where })
    ]);
    return NextResponse.json({ items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load question history";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to load question history" : "Access denied" }, { status });
  }
}
