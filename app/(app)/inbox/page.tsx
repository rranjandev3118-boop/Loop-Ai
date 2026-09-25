import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { FeedbackInbox } from "@/components/feedback-inbox";
import { FeedbackActions } from "@/components/feedback-actions";

type InboxSearchParams = {
  themeId?: string;
  q?: string;
  status?: string;
  sentiment?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default async function Inbox({ searchParams }: { searchParams?: InboxSearchParams }) {
  const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
  const pageSize = 10;
  const where = { workspaceId: user.workspaceId, deletedAt: null, ...(searchParams?.themeId ? { themes: { some: { themeId: searchParams.themeId } } } : {}) };
  const [items, total] = await Promise.all([
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      include: { themes: { include: { theme: true } } }
    }),
    db.feedback.count({ where })
  ]);
  const canEdit = user.role === "ADMIN" || user.role === "ANALYST";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"><Radio className="h-3.5 w-3.5" /> Feedback operations</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Feedback Inbox</h1>
          <p className="mt-1 text-slate-500">{user.role === "VIEWER" ? "Explore customer feedback and its themes." : "Search, triage, and move feedback through your team workflow."}</p>
        </div>
        {canEdit && <FeedbackActions />}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-semibold text-slate-900">Inbox queue</h2><p className="text-sm text-slate-500">Workspace-scoped feedback, newest first.</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{total} total records</span>
        </CardHeader>
        <CardContent>
          <FeedbackInbox
            initialItems={items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
            initialTotal={total}
            initialTotalPages={Math.ceil(total / pageSize)}
            canEdit={canEdit}
            initialFilters={{
              themeId: searchParams?.themeId,
              query: searchParams?.q,
              status: searchParams?.status,
              sentiment: searchParams?.sentiment,
              channel: searchParams?.channel,
              dateFrom: searchParams?.dateFrom,
              dateTo: searchParams?.dateTo
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
