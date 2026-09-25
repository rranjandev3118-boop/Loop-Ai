import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { createEmbedding } from "@/lib/embeddings";
import { answerFromRetrievedFeedback } from "@/lib/ai/ask";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ question: z.string().trim().min(3).max(1000) });

type RetrievedFeedback = {
  id: string;
  content: string;
  channel: string;
  sentiment: string | null;
  createdAt: Date;
  score: number;
};

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const { question } = requestSchema.parse(await request.json());
    const questionVector = createEmbedding(question);
    const vectorLiteral = `[${questionVector.join(",")}]`;
    const rows = await db.$queryRaw<Array<{
      id: string;
      content: string;
      channel: string;
      sentiment: string | null;
      createdAt: Date;
      score: number;
    }>>(Prisma.sql`
      SELECT f."id", f."content", f."channel", f."sentiment", f."createdAt",
        1 - (e."vectorPg" <=> ${vectorLiteral}::vector) AS "score"
      FROM "Feedback" f
      INNER JOIN "Embedding" e ON e."feedbackId" = f."id"
      WHERE f."workspaceId" = ${user.workspaceId}
        AND f."deletedAt" IS NULL
        AND e."vectorPg" IS NOT NULL
      ORDER BY e."vectorPg" <=> ${vectorLiteral}::vector
      LIMIT 8
    `);
    const retrieved: RetrievedFeedback[] = rows
      .map((row) => ({ id: row.id, content: row.content, channel: row.channel, sentiment: row.sentiment, createdAt: row.createdAt, score: Number(row.score) }))
      .filter((row) => row.score >= 0.05)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);

    if (!retrieved.length) {
      const history = await db.questionHistory.create({
        data: {
          workspaceId: user.workspaceId,
          userId: user.id,
          question,
          answer: "Not enough evidence in the available feedback.",
          citations: []
        }
      });
      return NextResponse.json({
        historyId: history.id,
        answer: "Not enough evidence in the available feedback.",
        sources: []
      });
    }

    const context = retrieved.map((row, index) => `[${index + 1}] id=${row.id} | channel=${row.channel} | sentiment=${row.sentiment ?? "unknown"} | ${row.content}`).join("\n");
    let answer: string;
    if (!process.env.ANTHROPIC_API_KEY) {
      answer = `Grounded result from ${retrieved.length} matching feedback item${retrieved.length === 1 ? "" : "s"}:\n\n${retrieved.slice(0, 3).map((row, index) => `[${index + 1}] ${row.content}`).join("\n\n")}`;
    } else {
      answer = await answerFromRetrievedFeedback(question, context);
    }

    const history = await db.questionHistory.create({
      data: {
        workspaceId: user.workspaceId,
        userId: user.id,
        question,
        answer,
        citations: retrieved.map((row, index) => ({ number: index + 1, id: row.id })),
        retrievalMeta: { count: retrieved.length }
      }
    });
    return NextResponse.json({
      historyId: history.id,
      answer,
      sources: retrieved.map((row, index) => ({
        number: index + 1,
        id: row.id,
        content: row.content,
        channel: row.channel,
        sentiment: row.sentiment,
        createdAt: row.createdAt
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to answer this question" : "Access denied" }, { status });
  }
}
