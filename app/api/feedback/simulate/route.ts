import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { classifyAndPersist } from "@/lib/classification";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ count: z.number().int().min(1).max(25).default(5) });

const templates = [
  "Support ticket: customers are reporting that onboarding invitations arrive late.",
  "Support ticket: customers say the dashboard is slow when loading reports.",
  "Support ticket: customers are confused by the latest invoice download flow.",
  "Support ticket: customers want a better mobile experience for daily tasks.",
  "Support ticket: customers are requesting an integration with their help desk."
];

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const payload = requestSchema.parse(await request.json().catch(() => ({})));
    const createdIds: string[] = [];
    const failures: number[] = [];

    for (let index = 0; index < payload.count; index += 1) {
      const feedback = await db.feedback.create({
        data: {
          content: `${templates[index % templates.length]} (simulated #${index + 1})`,
          channel: "Support ticket",
          sourceRef: `simulated-${Date.now()}-${index}`,
          customerLabel: "Simulated customer",
          workspaceId: user.workspaceId
        }
      });
      try {
        await classifyAndPersist(feedback.id, user.workspaceId);
        createdIds.push(feedback.id);
      } catch (error) {
        await db.feedback.deleteMany({ where: { id: feedback.id, workspaceId: user.workspaceId } });
        console.error("Simulated feedback classification failed", error);
        failures.push(index + 1);
      }
    }

    return NextResponse.json({
      created: createdIds.length,
      failed: failures.length,
      failedItems: failures,
      ids: createdIds,
      source: "simulated-support-tickets"
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate simulated feedback";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to generate simulated feedback" : "Access denied" }, { status });
  }
}
