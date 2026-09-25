import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { classifyAndPersist } from "@/lib/classification";

const schema = z.object({
  id: z.string().min(1)
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const payload = schema.parse(await request.json());
    
    const feedback = await db.feedback.findFirst({
      where: { id: payload.id, workspaceId: user.workspaceId, deletedAt: null },
      select: { id: true, content: true }
    });
    
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }
    
    const classification = await classifyAndPersist(feedback.id, user.workspaceId);
    
    const updated = await db.feedback.findFirst({
      where: { id: feedback.id, workspaceId: user.workspaceId, deletedAt: null },
      include: { themes: { include: { theme: true } } }
    });
    
    await db.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorId: user.id,
        entityType: "Feedback",
        entityId: feedback.id,
        action: "RECLASSIFY",
        newValue: { classification }
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      feedback: updated,
      classification 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Classification failed";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to reclassify feedback" : "Access denied" }, { status });
  }
}