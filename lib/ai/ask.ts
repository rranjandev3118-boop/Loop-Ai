export async function answerFromRetrievedFeedback(question: string, context: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Not enough evidence in the available feedback.";
  }
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 700,
    system: "You answer questions using only the supplied feedback records. Never infer facts that are not supported by those records. If the answer is not supported, say exactly: Not enough evidence in the available feedback. Cite supporting record numbers like [1] and [2].",
    messages: [{ role: "user", content: `Question: ${question}\n\nRetrieved feedback records:\n${context}` }]
  });
  return response.content.map((part) => part.type === "text" ? part.text : "").join("").trim();
}
