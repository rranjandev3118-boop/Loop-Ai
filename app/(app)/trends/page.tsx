import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyThemesState } from "@/components/ui/empty-state";
import { TrendingUp, BarChart3, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";

export default async function Trends() {
  const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);

  // Fetch themes with feedback counts and sentiment analysis
  const themes = await db.theme.findMany({
    where: { workspaceId: user.workspaceId, deletedAt: null, isArchived: false },
    include: {
      feedback: {
        where: { feedback: { deletedAt: null } },
        include: {
          feedback: {
            select: {
              sentiment: true,
              createdAt: true
            }
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  // Calculate theme statistics
  const themeStats = themes.map(theme => {
    const feedbackEntries = theme.feedback.map(item => item.feedback);
    const total = feedbackEntries.length;
    const positive = feedbackEntries.filter(f => f.sentiment === "POS").length;
    const negative = feedbackEntries.filter(f => f.sentiment === "NEG").length;
    const neutral = feedbackEntries.filter(f => f.sentiment === "NEU").length;

    // Calculate trend (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentCount = feedbackEntries.filter(f => new Date(f.createdAt) >= sevenDaysAgo).length;
    const previousCount = feedbackEntries.filter(f => {
      const date = new Date(f.createdAt);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    }).length;

    const trend = previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0;

    return {
      ...theme,
      stats: {
        total,
        positive,
        negative,
        neutral,
        recentCount,
        trend
      }
    };
  }).sort((a, b) => b.stats.total - a.stats.total);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="animate-slide-up">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <TrendingUp className="h-3.5 w-3.5" />
          Signal monitor
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Themes & Trends</h1>
        <p className="mt-1 text-slate-500">Theme volume and emerging customer topics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up stagger-1">
        <Card className="hover-lift border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-slate-600">Total Themes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{themes.length}</div>
          </CardContent>
        </Card>
        <Card className="hover-lift border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600">Rising Themes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {themeStats.filter(t => t.stats.trend > 10).length}
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift border-amber-100 bg-gradient-to-br from-amber-50/70 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-slate-600">Needs Attention</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {themeStats.filter(t => t.stats.negative / t.stats.total > 0.3).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Cards */}
      {themeStats.length === 0 ? (
        <Card className="animate-slide-up stagger-2">
          <CardContent className="p-12">
            <EmptyThemesState />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up stagger-2">
          {themeStats.map((theme, index) => (
            <Card key={theme.id} className="hover-lift">
              <CardHeader className="bg-gradient-to-br from-white to-slate-50/70">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-medium text-white">
                        {index + 1}
                      </div>
                      <Link href={`/inbox?themeId=${theme.id}`} className="font-medium text-slate-900 hover:text-indigo-600">{theme.name}</Link>
                    </div>
                    <p className="text-sm text-slate-500">{theme.description}</p>
                  </div>
                  <TrendIndicator trend={theme.stats.trend} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Volume */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Total Volume</span>
                      <span className="font-medium text-slate-900">{theme.stats.total}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.min((theme.stats.total / Math.max(...themeStats.map(t => t.stats.total))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Sentiment Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-green-50">
                      <div className="text-lg font-bold text-green-700">{theme.stats.positive}</div>
                      <div className="text-xs text-green-600">Positive</div>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50">
                      <div className="text-lg font-bold text-gray-700">{theme.stats.neutral}</div>
                      <div className="text-xs text-gray-600">Neutral</div>
                    </div>
                    <div className="p-2 rounded-lg bg-red-50">
                      <div className="text-lg font-bold text-red-700">{theme.stats.negative}</div>
                      <div className="text-xs text-red-600">Negative</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">This week</span>
                    <Badge variant="default">{theme.stats.recentCount} new</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: number }) {
  if (Math.abs(trend) < 5) {
    return (
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <span>Stable</span>
      </div>
    );
  }

  if (trend > 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <ArrowUpRight className="w-3 h-3" />
        <span>+{trend.toFixed(0)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-red-600">
      <ArrowDownRight className="w-3 h-3" />
      <span>{trend.toFixed(0)}%</span>
    </div>
  );
}
