import { z } from "zod";
import type { Sentiment } from "@prisma/client";
import { db } from "@/lib/db";
import { createEmbedding } from "@/lib/embeddings";
import { Prisma } from "@prisma/client";

const classificationSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  featureArea: z.string().trim().min(1).max(80),
  rationale: z.string().trim().min(1).max(500)
});

export type Classification = z.infer<typeof classificationSchema>;

export function fallbackClassification(content: string): Classification {
  const text = content.toLowerCase();
  const negative = ["slow", "broken", "fail", "can't", "cannot", "issue", "problem", "timeout", "need"].some((word) => text.includes(word));
  const positive = ["great", "love", "fast", "easy", "helpful", "saved", "excellent"].some((word) => text.includes(word));
  const sentiment = negative ? "NEG" : positive ? "POS" : "NEU";
  const themes = [
    text.includes("bill") || text.includes("invoice") || text.includes("payment") ? "Billing" : null,
    text.includes("mobile") || text.includes("phone") ? "Mobile" : null,
    text.includes("search") || text.includes("find") ? "Search" : null,
    text.includes("login") || text.includes("sso") || text.includes("security") ? "Security" : null,
    text.includes("report") || text.includes("export") ? "Reporting" : null,
    text.includes("speed") || text.includes("slow") || text.includes("load") ? "Performance" : null,
    text.includes("invite") || text.includes("onboard") ? "Onboarding" : null
  ].filter((value): value is string => Boolean(value));
  return {
    sentiment,
    sentimentScore: sentiment === "NEG" ? -0.65 : sentiment === "POS" ? 0.72 : 0,
    themes: themes.length ? themes : ["General feedback"],
    featureArea: themes[0] ?? "General",
    rationale: "Classified from the feedback language and persisted for later review."
  };
}

async function classifyWithClaude(content: string, existingThemes: string[]): Promise<Classification> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackClassification(content);
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 500,
    system: "You classify customer feedback. Return only valid JSON matching the requested schema. sentiment must be POS, NEU, or NEG; sentimentScore must be between -1 and 1. Reuse an existing theme when it is a reasonable fit. Create a new concise theme only when none fits. Return no markdown, commentary, or code fences.",
    messages: [{
      role: "user",
      content: `Existing themes: ${existingThemes.length ? existingThemes.join(", ") : "None yet"}\n\nClassify this feedback as JSON with keys sentiment, sentimentScore, themes (array), featureArea, rationale. Keep rationale to one sentence.\n\nFeedback:\n${content}`
    }]
  });
  const text = response.content.map((part) => part.type === "text" ? part.text : "").join("").trim();
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("CLASSIFICATION_INVALID");
  return classificationSchema.parse(JSON.parse(json));
}

export async function classifyAndPersist(feedbackId: string, workspaceId: string): Promise<Classification> {
  const feedback = await db.feedback.findFirst({ where: { id: feedbackId, workspaceId, deletedAt: null }, select: { id: true, content: true } });
  if (!feedback) throw new Error("NOT_FOUND");
  const existingThemes = await db.theme.findMany({ where: { workspaceId }, select: { name: true }, orderBy: { name: "asc" } });
  let result: Classification;
  let classificationStatus = "CLASSIFIED";
  try {
    result = await classifyWithClaude(feedback.content, existingThemes.map((theme) => theme.name));
  } catch (firstError) {
    if (!process.env.ANTHROPIC_API_KEY) throw firstError;
    try {
      result = await classifyWithClaude(feedback.content, existingThemes.map((theme) => theme.name));
    } catch (secondError) {
      console.error("Claude classification failed after retry", secondError);
      result = fallbackClassification(feedback.content);
      classificationStatus = "MANUAL_REVIEW";
    }
  }
  const vector = createEmbedding(feedback.content);
  await db.$transaction(async (tx) => {
    await tx.feedback.update({
      where: { id: feedback.id },
      data: {
        sentiment: result.sentiment as Sentiment,
        sentimentScore: result.sentimentScore,
        featureArea: result.featureArea,
        rationale: result.rationale,
        classificationStatus
      }
    });
    await tx.feedbackTheme.deleteMany({ where: { feedbackId: feedback.id } });
    for (const themeName of result.themes) {
      const theme = await tx.theme.upsert({
        where: { id: `${workspaceId}:${themeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
        update: {},
        create: {
          id: `${workspaceId}:${themeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: themeName,
          description: `Feedback theme for ${themeName}`,
          workspaceId
        }
      });
      await tx.feedbackTheme.create({
        data: { feedbackId: feedback.id, themeId: theme.id, confidence: 0.9 }
      });
    }
    await tx.embedding.upsert({
      where: { feedbackId: feedback.id },
      update: { vector },
      create: { feedbackId: feedback.id, vector }
    });
  });
  await db.$executeRaw(Prisma.sql`
    UPDATE "Embedding"
    SET "vectorPg" = ${`[${vector.join(",")}]`}::vector
    WHERE "feedbackId" = ${feedback.id}
  `);
  return result;
}
