import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const notifications = await db.notification.findMany({
      where: { workspaceId: user.workspaceId, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return NextResponse.json({ items: notifications, unread: notifications.filter((item) => !item.readAt).length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to load notifications" : "Access denied" }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const payload = z.object({ id: z.string().min(1) }).parse(await request.json());
    const result = await db.notification.updateMany({
      where: { id: payload.id, workspaceId: user.workspaceId, userId: user.id },
      data: { readAt: new Date() }
    });
    if (!result.count) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update notification";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to update notification" : "Access denied" }, { status });
  }
}
