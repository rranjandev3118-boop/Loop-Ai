"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, MessageSquare, CheckCircle } from "lucide-react";

export default function Ask() {
  const [question, setQuestion] = useState("What are users saying about onboarding?");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Array<{ number: number; id: string; content: string; channel: string; sentiment: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const response = await fetch("/api/insights/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setAnswer(data.answer || "No answer received");
        setSources(data.sources || []);
      }
    } catch (err) {
      setError("Failed to get answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const suggestedQuestions = [
    "What are users saying about onboarding?",
    "What are the main pain points in our product?",
    "How has sentiment changed over the past month?",
    "What features are users requesting most?"
  ];

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          Grounded workspace intelligence
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ask LOOP</h1>
        <p className="text-slate-500 mt-1">
          Ask questions and receive answers grounded in your feedback data
        </p>
      </div>

      {/* Question Input */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Ask a Question</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <textarea
              className="w-full min-h-32 p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your customer feedback..."
            />

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Answers are grounded in your feedback data
              </div>
              <Button
                variant="primary"
                onClick={ask}
                disabled={loading || !question.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Ask LOOP
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-slate-600 mb-3">Suggested questions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((sq, index) => (
              <button
                key={index}
                onClick={() => setQuestion(sq)}
                className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Answer */}
      {answer && (
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Answer</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {answer}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle className="w-3 h-3" />
                <span>This answer is grounded in your feedback data</span>
              </div>
              {sources.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Retrieved feedback</h3>
                  <p className="mt-1 text-xs text-slate-500">These workspace records were supplied as evidence for the answer.</p>
                  <div className="mt-3 space-y-2">
                    {sources.map((source) => (
                      <div key={source.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                          <span>[{source.number}] {source.channel}</span>
                          <span>{source.sentiment ?? "Unclassified"}</span>
                        </div>
                        <p className="text-slate-700">{source.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
