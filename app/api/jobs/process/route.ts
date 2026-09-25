import { NextResponse } from "next/server";
import { classifyAndPersist } from "@/lib/ai/classification";
import { runNextJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const job = await runNextJob(`vercel-cron:${process.env.VERCEL_REGION ?? "default"}`, async (claimed) => {
    if (claimed.type !== "CLASSIFICATION") throw new Error(`Unsupported job type: ${claimed.type}`);
    const payload = claimed.payload as { feedbackId?: string };
    if (!payload.feedbackId) throw new Error("CLASSIFICATION_JOB_PAYLOAD_INVALID");
    await classifyAndPersist(payload.feedbackId, claimed.workspaceId);
  });
  return NextResponse.json({ processed: Boolean(job), jobId: job?.id ?? null });
}
