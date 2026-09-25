"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Feedback = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  themes: Array<{ theme: { id: string; name: string } }>;
};

export function DashboardRecentFeedback({ initialItems, initialTotal }: { initialItems: Feedback[]; initialTotal: number }) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load(nextPage: number) {
    setLoading(true);
    try {
      const response = await fetch(`/api/feedback?page=${nextPage}&pageSize=${pageSize}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load feedback");
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader className="bg-gradient-to-r from-white to-slate-50/80">
        <div className="flex items-center justify-between gap-3">
          <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" /><h2 className="text-lg font-medium text-slate-900">Recent Feedback</h2></div><p className="mt-1 text-xs text-slate-500">Latest customer signals entering your workspace</p></div>
          <Link href="/inbox" className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 transition hover:border-violet-200 hover:text-violet-600 sm:inline-flex">Open inbox <Radio className="h-3 w-3" /></Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`space-y-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {items.map((feedback) => (
            <div key={feedback.id} className={`rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md ${feedback.sentiment === "NEG" ? "border-l-4 border-l-rose-400" : feedback.sentiment === "POS" ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-300"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm leading-6 text-slate-800">{feedback.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="default" className="text-xs">{feedback.channel}</Badge>
                    <Badge variant={feedback.sentiment === "POS" ? "success" : feedback.sentiment === "NEG" ? "danger" : "warning"} className="text-xs">{feedback.sentiment || "Pending"}</Badge>
                    <Badge variant="default" className="text-xs">{feedback.status}</Badge>
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] text-slate-400 shadow-sm">{new Date(feedback.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </div>
              {feedback.themes.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{feedback.themes.map(({ theme }) => <span key={theme.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/70">{theme.name}</span>)}</div>}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => void load(page - 1)} disabled={page === 1 || loading} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30" aria-label="Previous recent feedback page"><ChevronLeft className="h-4 w-4" /></button>
            <span className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white">{page} / {totalPages}</span>
            <button type="button" onClick={() => void load(page + 1)} disabled={page >= totalPages || loading} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30" aria-label="Next recent feedback page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
