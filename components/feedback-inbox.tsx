"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Clock3, Filter, Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Feedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  themes: Array<{ theme: { id: string; name: string } }>;
};

type Props = {
  initialItems: Feedback[];
  initialTotal: number;
  initialTotalPages: number;
  canEdit: boolean;
  initialFilters?: {
    themeId?: string;
    query?: string;
    status?: string;
    sentiment?: string;
    channel?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

const statuses = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACTIONED", label: "Actioned" }
];

export function FeedbackInbox({ initialItems, initialTotal, initialTotalPages, canEdit, initialFilters }: Props) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [query, setQuery] = useState(initialFilters?.query ?? "");
  const [status, setStatus] = useState(initialFilters?.status ?? "");
  const [sentiment, setSentiment] = useState(initialFilters?.sentiment ?? "");
  const [channel, setChannel] = useState(initialFilters?.channel ?? "");
  const [themeId, setThemeId] = useState(initialFilters?.themeId ?? "");
  const [dateFrom, setDateFrom] = useState(initialFilters?.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(initialFilters?.dateTo ?? "");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<{ id: string; action: "status" | "reclassify" } | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Feedback | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(nextPage), pageSize: "10" });
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (sentiment) params.set("sentiment", sentiment);
    if (channel.trim()) params.set("channel", channel.trim());
    if (themeId) params.set("themeId", themeId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    try {
      const response = await fetch(`/api/feedback?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load feedback");
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load feedback");
    } finally {
      setLoading(false);
    }
  }, [channel, dateFrom, dateTo, query, sentiment, status, themeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateStatus(id: string, nextStatus: Feedback["status"]) {
    setUpdating({ id, action: "status" });
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update status");
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: data.feedback.status } : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update status");
    } finally {
      setUpdating(null);
    }

  }

  async function reclassify(id: string) {
    setUpdating({ id, action: "reclassify" });
    setError("");
    try {
      const response = await fetch("/api/feedback/classify", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ id }) 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to re-classify feedback");
      await load(page);
    } catch (reclassifyError) {
      setError(reclassifyError instanceof Error ? reclassifyError.message : "Unable to re-classify feedback");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_180px_145px_145px_auto]">
          <label className="relative block">
            <span className="sr-only">Search feedback</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search feedback..." />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by sentiment</span>
            <select className="input" value={sentiment} onChange={(event) => setSentiment(event.target.value)}>
              <option value="">All sentiment</option>
              <option value="POS">Positive</option>
              <option value="NEU">Neutral</option>
              <option value="NEG">Negative</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by channel</span>
            <input className="input" value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="Channel" />
          </label>
          <label>
            <span className="sr-only">Filter from date</span>
            <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="From date" />
          </label>
          <label>
            <span className="sr-only">Filter to date</span>
            <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="To date" />
          </label>
          <Button type="button" variant="secondary" onClick={() => { setQuery(""); setStatus(""); setSentiment(""); setChannel(""); setThemeId(""); setDateFrom(""); setDateTo(""); }} className="gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Clear
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Showing {items.length} of {total}</span>
          {loading && <span className="inline-flex items-center gap-1.5 text-violet-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating</span>}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="space-y-3">
        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">No feedback matches those filters</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search or clear the filters.</p>
          </div>
        ) : items.map((item) => (
          <article key={item.id} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md" onClick={() => setSelected(item)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="leading-6 text-slate-800">{item.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge>{item.channel}</Badge>
                  {item.sentiment && <Badge variant={item.sentiment === "POS" ? "success" : item.sentiment === "NEG" ? "danger" : "default"}>{item.sentiment === "POS" ? "Positive" : item.sentiment === "NEG" ? "Negative" : "Neutral"}</Badge>}
                  <StatusBadge status={item.status} />
                  {item.customerLabel && <span className="text-xs text-slate-500">{item.customerLabel}</span>}
                </div>
                {item.themes.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.themes.map(({ theme }) => <span key={theme.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{theme.name}</span>)}</div>}
              </div>
              {canEdit && <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="ghost" disabled={updating?.id === item.id} onClick={() => void reclassify(item.id)} title="Re-classify with LOOP">{updating?.id === item.id && updating.action === "reclassify" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Classifying</> : <><Sparkles className="h-3.5 w-3.5" /> Re-classify</>}</Button>
                {item.status === "NEW" && <Button type="button" size="sm" variant="secondary" disabled={updating?.id === item.id} onClick={() => void updateStatus(item.id, "REVIEWED")}>{updating?.id === item.id && updating.action === "status" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reviewing</> : "Review"}</Button>}
                {item.status === "REVIEWED" && <Button type="button" size="sm" variant="primary" disabled={updating?.id === item.id} onClick={() => void updateStatus(item.id, "ACTIONED")}>{updating?.id === item.id && updating.action === "status" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving</> : "Mark actioned"}</Button>}
              </div>}
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" role="dialog" aria-modal="true" aria-label="Feedback details" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Feedback details</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.channel} · {new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button type="button" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={() => setSelected(null)}>Close</button>
            </div>
            <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-800">{selected.content}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {selected.sentiment && <Badge>{selected.sentiment}</Badge>}
              <StatusBadge status={selected.status} />
              {selected.themes.map(({ theme }) => <Badge key={theme.id}>{theme.name}</Badge>)}
            </div>
            {canEdit && (
              <div className="mt-6 flex gap-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  disabled={updating?.id === selected.id} 
                  onClick={() => void reclassify(selected.id)}
                  className="gap-2"
                >
                  {updating?.id === selected.id && updating.action === "reclassify" ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Classifying</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> Re-classify with AI</>
                  )}
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{total === 0 ? 0 : (page - 1) * 10 + 1}-{Math.min(page * 10, total)}</span> of <span className="font-medium text-slate-700">{total}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Page {page} of {Math.max(totalPages, 1)}</div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 sm:justify-end">
          <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 sm:flex" disabled={page <= 1 || loading} onClick={() => void load(1)} aria-label="Go to first page"><ChevronFirst className="h-4 w-4" /></button>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30" disabled={page <= 1 || loading} onClick={() => void load(page - 1)} aria-label="Go to previous page"><ChevronLeft className="h-4 w-4" /></button>
          <div className="flex items-center gap-1" aria-label={`Page ${page} of ${Math.max(totalPages, 1)}`}>
            {getPageNumbers(page, Math.max(totalPages, 1)).map((pageNumber, index) => pageNumber === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">…</span>
            ) : (
              <button
                key={pageNumber}
                type="button"
                disabled={loading}
                onClick={() => void load(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
                className={`h-8 min-w-8 rounded-lg px-2 text-sm transition ${pageNumber === page ? "bg-slate-900 font-medium text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30" disabled={page >= totalPages || loading} onClick={() => void load(page + 1)} aria-label="Go to next page"><ChevronRight className="h-4 w-4" /></button>
          <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 sm:flex" disabled={page >= totalPages || loading} onClick={() => void load(totalPages)} aria-label="Go to last page"><ChevronLast className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages];
  if (currentPage >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

function StatusBadge({ status }: { status: Feedback["status"] }) {
  const config = {
    NEW: { label: "New", variant: "warning" as const, icon: Clock3 },
    REVIEWED: { label: "Reviewed", variant: "default" as const, icon: CheckCircle2 },
    ACTIONED: { label: "Actioned", variant: "success" as const, icon: CheckCircle2 }
  }[status];
  const Icon = config.icon;
  return <Badge variant={config.variant}><Icon className="mr-1 h-3.5 w-3.5" />{config.label}</Badge>;
}
