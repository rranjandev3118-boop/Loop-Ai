import test from "node:test";
import assert from "node:assert/strict";
import { fallbackClassification } from "@/lib/ai/classification";
import { answerFromRetrievedFeedback } from "@/lib/ai/ask";

test("AI fallback classifies common negative feedback deterministically", () => {
  const result = fallbackClassification("The mobile app is slow and broken");
  assert.equal(result.sentiment, "NEG");
  assert.equal(result.featureArea, "Mobile");
  assert.ok(result.themes.includes("Performance"));
  assert.ok(result.sentimentScore < 0);
});

test("AI fallback provides a usable neutral classification", () => {
  const result = fallbackClassification("The product was mentioned in a meeting");
  assert.equal(result.sentiment, "NEU");
  assert.deepEqual(result.themes, ["General feedback"]);
});

test("Ask LOOP fails closed without an API key", async () => {
  const previous = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.equal(await answerFromRetrievedFeedback("What is the issue?", "[1] A record"), "Not enough evidence in the available feedback.");
  } finally {
    if (previous) process.env.ANTHROPIC_API_KEY = previous;
  }
});

