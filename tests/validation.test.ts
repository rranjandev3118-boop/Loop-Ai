import test from "node:test";
import assert from "node:assert/strict";
import { feedbackActionSchema, feedbackCreateSchema, feedbackQuerySchema } from "@/lib/validation";

test("feedback create schema accepts a valid API payload", () => {
  const result = feedbackCreateSchema.parse({ content: " Login is fast ", channel: "Support ticket" });
  assert.equal(result.content, "Login is fast");
});

test("feedback create schema rejects empty content and malformed dates", () => {
  assert.equal(feedbackCreateSchema.safeParse({ content: " ", channel: "support" }).success, false);
  assert.equal(feedbackCreateSchema.safeParse({ content: "ok", channel: "support", createdAt: "yesterday" }).success, false);
});

test("feedback query schema applies safe pagination defaults and bounds", () => {
  assert.deepEqual(feedbackQuerySchema.parse({}), { page: 1, pageSize: 10 });
  assert.equal(feedbackQuerySchema.safeParse({ pageSize: 51 }).success, false);
  assert.equal(feedbackQuerySchema.safeParse({ dateFrom: "2026-09-19", dateTo: "2026-09-18" }).success, false);
  assert.equal(feedbackQuerySchema.safeParse({ dateFrom: "2026-09-18", dateTo: "2026-09-19" }).success, true);
});

test("feedback actions require exactly one operation", () => {
  assert.equal(feedbackActionSchema.safeParse({ id: "f1", status: "REVIEWED" }).success, true);
  assert.equal(feedbackActionSchema.safeParse({ id: "f1", action: "reclassify" }).success, true);
  assert.equal(feedbackActionSchema.safeParse({ id: "f1" }).success, false);
  assert.equal(feedbackActionSchema.safeParse({ id: "f1", status: "NEW", action: "reclassify" }).success, false);
});
