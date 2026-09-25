import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { subDays, format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, TrendingUp, Users, MessageSquare, AlertCircle, CheckCircle, Plus, Settings, Activity, Zap } from "lucide-react";
import { DashboardCharts, type DashboardChartData } from "@/components/dashboard-charts";
import { QuickActions } from "@/components/quick-actions";
import { DashboardRecentFeedback } from "@/components/dashboard-recent-feedback";

type ThemeSummary = {
  id: string;
  name: string;
  description: string | null;
  feedback: Array<{ feedbackId: string; themeId: string; confidence: number }>;
};

type DashboardFeedback = {
  id: string;
  content: string;
  channel: string;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: Date | string;
  themes: Array<{ theme: { id: string; name: string } }>;
};

type TeamMember = {
  name: string;
  email: string;
  role: "ADMIN" | "ANALYST" | "VIEWER";
  createdAt: Date | string;
};

export default async function Dashboard() {
  const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);

  // Fetch dashboard metrics
  const [total, negative, positive, neutral, newWeek, unreviewed] = await Promise.all([
    db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null } }),
    db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null, sentiment: "NEG" } }),
    db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null, sentiment: "POS" } }),
    db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null, sentiment: "NEU" } }),
    db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null, createdAt: { gte: subDays(new Date(), 7) } } }),
    db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null, status: "NEW" } })
  ]);

  const volumeRows = await db.feedback.findMany({
    where: { workspaceId: user.workspaceId, deletedAt: null, createdAt: { gte: subDays(new Date(), 13) } },
    select: { createdAt: true }
  });
  const volume: DashboardChartData["volume"] = Array.from({ length: 14 }, (_, index) => {
    const date = subDays(new Date(), 13 - index);
    const key = format(date, "yyyy-MM-dd");
    return { label: format(date, "MMM d"), value: volumeRows.filter((row) => format(new Date(row.createdAt), "yyyy-MM-dd") === key).length };
  });
  const chartData: DashboardChartData = {
    volume,
    sentiment: [
      { label: "Positive", value: positive, color: "bg-emerald-500" },
      { label: "Neutral", value: neutral, color: "bg-slate-400" },
      { label: "Negative", value: negative, color: "bg-rose-500" }
    ],
    themes: []
  };

  // Fetch themes with feedback counts
  const themes = await db.theme.findMany({
    where: { workspaceId: user.workspaceId, deletedAt: null, isArchived: false },
    include: { feedback: true },
    take: 8,
    orderBy: { feedback: { _count: "desc" } }
  });
  chartData.themes = themes.map((theme) => ({ label: theme.name, value: theme.feedback.length })).sort((a, b) => b.value - a.value);

  // Fetch team members (ADMIN only)
  const teamMembers = user.role === "ADMIN" ? await db.user.findMany({
    where: { workspaceId: user.workspaceId, disabledAt: null },
    select: { name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  }) : [];

  // Fetch recent feedback
  const [recentFeedback, feedbackTotal] = await Promise.all([db.feedback.findMany({
    where: { workspaceId: user.workspaceId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { themes: { include: { theme: true } } }
  }), db.feedback.count({ where: { workspaceId: user.workspaceId, deletedAt: null } })]);

  const negativePercentage = total > 0 ? Math.round((negative / total) * 100) : 0;
  const positivePercentage = total > 0 ? Math.round((positive / total) * 100) : 0;

  // Role-specific dashboard rendering
  if (user.role === "ADMIN") {
    return <AdminDashboard user={user} total={total} negative={negative} positive={positive} neutral={neutral} newWeek={newWeek} themes={themes} teamMembers={teamMembers} recentFeedback={recentFeedback} feedbackTotal={feedbackTotal} negativePercentage={negativePercentage} positivePercentage={positivePercentage} chartData={chartData} />;
  }

  if (user.role === "ANALYST") {
    return <AnalystDashboard user={user} total={total} negative={negative} positive={positive} neutral={neutral} newWeek={newWeek} unreviewed={unreviewed} themes={themes} recentFeedback={recentFeedback} feedbackTotal={feedbackTotal} negativePercentage={negativePercentage} positivePercentage={positivePercentage} chartData={chartData} />;
  }

  return <ViewerDashboard user={user} total={total} negative={negative} positive={positive} neutral={neutral} themes={themes} recentFeedback={recentFeedback} feedbackTotal={feedbackTotal} negativePercentage={negativePercentage} positivePercentage={positivePercentage} chartData={chartData} />;
}

// ADMIN DASHBOARD - Workspace Command Center
function AdminDashboard({
  user,
  total,
  negative,
  positive,
  neutral,
  newWeek,
  themes,
  teamMembers,
  recentFeedback,
  feedbackTotal,
  negativePercentage,
  positivePercentage,
  chartData
}: {
  user: { id: string; name: string; role: "ADMIN" | "ANALYST" | "VIEWER"; workspaceId: string };
  total: number;
  negative: number;
  positive: number;
  neutral: number;
  newWeek: number;
  themes: ThemeSummary[];
  teamMembers: TeamMember[];
  recentFeedback: DashboardFeedback[];
  feedbackTotal: number;
  negativePercentage: number;
  positivePercentage: number;
  chartData: DashboardChartData;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col items-start justify-between gap-3 animate-slide-up sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Workspace Command Center
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Good morning, {user.name}</h1>
          <p className="text-slate-500 mt-1">Workspace Command Center</p>
        </div>
        <div className="text-sm text-slate-500">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Feedback"
          value={total.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
          color="indigo"
          className="animate-slide-up stagger-1"
        />
        <StatCard
          title="Negative"
          value={`${negativePercentage}%`}
          icon={<AlertCircle className="w-5 h-5" />}
          trend="-3%"
          trendUp={true}
          color="red"
          className="animate-slide-up stagger-2"
        />
        <StatCard
          title="New This Week"
          value={newWeek.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="+8%"
          trendUp={true}
          color="green"
          className="animate-slide-up stagger-3"
        />
        <StatCard
          title="Team Members"
          value={teamMembers.length.toString()}
          icon={<Users className="w-5 h-5" />}
          trend="Active"
          color="blue"
          className="animate-slide-up stagger-4"
        />
      </div>
      <DashboardCharts data={chartData} />

      {/* Admin Quick Actions */}
      <Card className="animate-slide-up stagger-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-indigo-900">Quick Actions</h2>
        </CardHeader>
        <CardContent>
          <QuickActions canInvite={true} canReport={true} />
        </CardContent>
      </Card>

      {/* Sentiment Breakdown */}
      <Card className="animate-slide-up stagger-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Sentiment Breakdown</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SentimentBar label="Positive" value={positive} total={total} color="bg-green-500" />
            <SentimentBar label="Neutral" value={neutral} total={total} color="bg-gray-400" />
            <SentimentBar label="Negative" value={negative} total={total} color="bg-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* Top Themes */}
      <Card className="animate-slide-up">
        <CardHeader>
          <h2 className="text-lg font-semibold">Top Themes</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {themes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No themes identified yet</p>
              </div>
            ) : (
              themes.map((theme, index) => (
                <div key={theme.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{theme.name}</div>
                      <div className="text-sm text-slate-500">{theme.description}</div>
                    </div>
                  </div>
                  <Badge variant="default">{theme.feedback.length} items</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <DashboardRecentFeedback initialItems={recentFeedback.map((item) => ({ ...item, createdAt: new Date(item.createdAt).toISOString() }))} initialTotal={feedbackTotal} />
      {false && <Card className="animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-white to-slate-50/80">
          <div className="flex items-center justify-between">
            <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" /><h2 className="text-lg font-medium text-slate-900">Recent Feedback</h2></div><p className="mt-1 text-xs text-slate-500">Latest customer signals entering your workspace</p></div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Live feed</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentFeedback.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No feedback yet</p>
              </div>
            ) : (
              recentFeedback.map((feedback) => (
                <div key={feedback.id} className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md ${feedback.sentiment === "NEG" ? "border-l-4 border-l-rose-400" : feedback.sentiment === "POS" ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-300"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm leading-6 text-slate-800 line-clamp-2">{feedback.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="text-xs">{feedback.channel}</Badge>
                        <Badge
                          variant={feedback.sentiment === "POS" ? "success" : feedback.sentiment === "NEG" ? "danger" : "warning"}
                          className="text-xs"
                        >
                          {feedback.sentiment || "Pending"}
                        </Badge>
                        <Badge variant="default" className="text-xs">{feedback.status}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] text-slate-400 shadow-sm">
                      {format(new Date(feedback.createdAt), "MMM d, HH:mm")}
                    </div>
                  </div>
                  {feedback.themes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {feedback.themes.map((ft) => (
                        <span key={ft.theme.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/70">
                          {ft.theme.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>}

      {/* Team Overview */}
      {teamMembers.length > 0 && (
        <Card className="animate-slide-up">
          <CardHeader>
            <h2 className="text-lg font-semibold">Team Overview</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.email} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{member.name}</div>
                      <div className="text-sm text-slate-500">{member.email}</div>
                    </div>
                  </div>
                  <Badge variant={member.role === "ADMIN" ? "role-admin" : member.role === "ANALYST" ? "role-analyst" : "role-viewer"}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ANALYST DASHBOARD - Feedback Intelligence Workspace
function AnalystDashboard({
  user,
  total,
  negative,
  positive,
  neutral,
  newWeek,
  unreviewed,
  themes,
  recentFeedback,
  feedbackTotal,
  negativePercentage,
  positivePercentage,
  chartData
}: {
  user: { id: string; role: "ADMIN" | "ANALYST" | "VIEWER"; workspaceId: string };
  total: number;
  negative: number;
  positive: number;
  neutral: number;
  newWeek: number;
  unreviewed: number;
  themes: ThemeSummary[];
  recentFeedback: DashboardFeedback[];
  feedbackTotal: number;
  negativePercentage: number;
  positivePercentage: number;
  chartData: DashboardChartData;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col items-start justify-between gap-3 animate-slide-up sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back, Analyst</h1>
          <p className="text-slate-500 mt-1">Feedback Intelligence Workspace</p>
        </div>
        <div className="text-sm text-slate-500">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* Analyst Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Feedback"
          value={total.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
          color="indigo"
          className="animate-slide-up stagger-1"
        />
        <StatCard
          title="Negative"
          value={`${negativePercentage}%`}
          icon={<AlertCircle className="w-5 h-5" />}
          trend="-3%"
          trendUp={true}
          color="red"
          className="animate-slide-up stagger-2"
        />
        <StatCard
          title="New This Week"
          value={newWeek.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="+8%"
          trendUp={true}
          color="green"
          className="animate-slide-up stagger-3"
        />
        <StatCard
          title="Unreviewed"
          value={unreviewed.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          trend="Action needed"
          color="amber"
          className="animate-slide-up stagger-4"
        />
      </div>
      <DashboardCharts data={chartData} />

      {/* Analyst Quick Actions */}
      <Card className="animate-slide-up stagger-5 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-green-900">Quick Actions</h2>
        </CardHeader>
        <CardContent>
          <QuickActions canInvite={false} canReport={true} />
        </CardContent>
      </Card>

      {/* Sentiment Breakdown */}
      <Card className="animate-slide-up stagger-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Sentiment Breakdown</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SentimentBar label="Positive" value={positive} total={total} color="bg-green-500" />
            <SentimentBar label="Neutral" value={neutral} total={total} color="bg-gray-400" />
            <SentimentBar label="Negative" value={negative} total={total} color="bg-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* Top Themes */}
      <Card className="animate-slide-up">
        <CardHeader>
          <h2 className="text-lg font-semibold">Top Themes</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {themes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No themes identified yet</p>
              </div>
            ) : (
              themes.map((theme, index) => (
                <div key={theme.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{theme.name}</div>
                      <div className="text-sm text-slate-500">{theme.description}</div>
                    </div>
                  </div>
                  <Badge variant="default">{theme.feedback.length} items</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <DashboardRecentFeedback initialItems={recentFeedback.map((item) => ({ ...item, createdAt: new Date(item.createdAt).toISOString() }))} initialTotal={feedbackTotal} />
      {false && <Card className="animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-white to-slate-50/80">
          <div className="flex items-center justify-between">
            <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" /><h2 className="text-lg font-medium text-slate-900">Recent Feedback</h2></div><p className="mt-1 text-xs text-slate-500">Latest customer signals entering your workspace</p></div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Live feed</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentFeedback.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No feedback yet</p>
              </div>
            ) : (
              recentFeedback.map((feedback) => (
                <div key={feedback.id} className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md ${feedback.sentiment === "NEG" ? "border-l-4 border-l-rose-400" : feedback.sentiment === "POS" ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-300"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm leading-6 text-slate-800 line-clamp-2">{feedback.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="text-xs">{feedback.channel}</Badge>
                        <Badge
                          variant={feedback.sentiment === "POS" ? "success" : feedback.sentiment === "NEG" ? "danger" : "warning"}
                          className="text-xs"
                        >
                          {feedback.sentiment || "Pending"}
                        </Badge>
                        <Badge variant="default" className="text-xs">{feedback.status}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] text-slate-400 shadow-sm">
                      {format(new Date(feedback.createdAt), "MMM d, HH:mm")}
                    </div>
                  </div>
                  {feedback.themes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {feedback.themes.map((ft) => (
                        <span key={ft.theme.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/70">
                          {ft.theme.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

// VIEWER DASHBOARD - Customer Insights
function ViewerDashboard({
  user,
  total,
  negative,
  positive,
  neutral,
  themes,
  recentFeedback,
  feedbackTotal,
  negativePercentage,
  positivePercentage,
  chartData
}: {
  user: { id: string; role: "ADMIN" | "ANALYST" | "VIEWER"; workspaceId: string };
  total: number;
  negative: number;
  positive: number;
  neutral: number;
  themes: ThemeSummary[];
  recentFeedback: DashboardFeedback[];
  feedbackTotal: number;
  negativePercentage: number;
  positivePercentage: number;
  chartData: DashboardChartData;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col items-start justify-between gap-3 animate-slide-up sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hello, Viewer</h1>
          <p className="text-slate-500 mt-1">Customer Insights Dashboard</p>
        </div>
        <div className="text-sm text-slate-500">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </div>
      </div>

      {/* Viewer Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Feedback"
          value={total.toLocaleString()}
          icon={<MessageSquare className="w-5 h-5" />}
          trend="+12%"
          trendUp={true}
          color="indigo"
          className="animate-slide-up stagger-1"
        />
        <StatCard
          title="Negative"
          value={`${negativePercentage}%`}
          icon={<AlertCircle className="w-5 h-5" />}
          trend="-3%"
          trendUp={true}
          color="red"
          className="animate-slide-up stagger-2"
        />
        <StatCard
          title="Positive"
          value={`${positivePercentage}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend="+5%"
          trendUp={true}
          color="green"
          className="animate-slide-up stagger-3"
        />
        <StatCard
          title="Themes"
          value={themes.length.toString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="Active"
          color="blue"
          className="animate-slide-up stagger-4"
        />
      </div>
      <DashboardCharts data={chartData} />

      {/* Sentiment Breakdown */}
      <Card className="animate-slide-up stagger-5">
        <CardHeader>
          <h2 className="text-lg font-semibold">Sentiment Breakdown</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SentimentBar label="Positive" value={positive} total={total} color="bg-green-500" />
            <SentimentBar label="Neutral" value={neutral} total={total} color="bg-gray-400" />
            <SentimentBar label="Negative" value={negative} total={total} color="bg-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* Top Themes */}
      <Card className="animate-slide-up">
        <CardHeader>
          <h2 className="text-lg font-semibold">Top Themes</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {themes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No themes identified yet</p>
              </div>
            ) : (
              themes.map((theme, index) => (
                <div key={theme.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors hover-lift">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{theme.name}</div>
                      <div className="text-sm text-slate-500">{theme.description}</div>
                    </div>
                  </div>
                  <Badge variant="default">{theme.feedback.length} items</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <DashboardRecentFeedback initialItems={recentFeedback.map((item) => ({ ...item, createdAt: new Date(item.createdAt).toISOString() }))} initialTotal={feedbackTotal} />
      {false && <Card className="animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-white to-slate-50/80">
          <div className="flex items-center justify-between">
            <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" /><h2 className="text-lg font-medium text-slate-900">Recent Feedback</h2></div><p className="mt-1 text-xs text-slate-500">Latest customer signals entering your workspace</p></div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Live feed</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentFeedback.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No feedback yet</p>
              </div>
            ) : (
              recentFeedback.map((feedback) => (
                <div key={feedback.id} className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md ${feedback.sentiment === "NEG" ? "border-l-4 border-l-rose-400" : feedback.sentiment === "POS" ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-300"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm leading-6 text-slate-800 line-clamp-2">{feedback.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="text-xs">{feedback.channel}</Badge>
                        <Badge
                          variant={feedback.sentiment === "POS" ? "success" : feedback.sentiment === "NEG" ? "danger" : "warning"}
                          className="text-xs"
                        >
                          {feedback.sentiment || "Pending"}
                        </Badge>
                        <Badge variant="default" className="text-xs">{feedback.status}</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] text-slate-400 shadow-sm">
                      {format(new Date(feedback.createdAt), "MMM d, HH:mm")}
                    </div>
                  </div>
                  {feedback.themes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {feedback.themes.map((ft) => (
                        <span key={ft.theme.id} className="rounded-md bg-white px-2 py-1 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/70">
                          {ft.theme.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendUp, color, className = '' }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendUp?: boolean;
  color: "indigo" | "red" | "green" | "blue" | "amber";
  className?: string;
}) {
  const colorClasses = {
    indigo: "from-indigo-500 to-purple-600",
    red: "from-red-500 to-rose-600",
    green: "from-green-500 to-emerald-600",
    blue: "from-blue-500 to-cyan-600",
    amber: "from-amber-500 to-orange-600"
  };

  return (
    <Card className={`dashboard-stat-card group relative overflow-hidden ${className}`}>
      <div className={`pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${colorClasses[color]} opacity-[0.1] blur-3xl transition duration-500 group-hover:scale-125`} />
      <CardContent className="relative flex min-h-[164px] items-center justify-between gap-5 p-5">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3">
            <div className="relative">
              <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg shadow-indigo-500/15 ring-4 ring-white/80 transition duration-300 group-hover:-translate-y-0.5 group-hover:rotate-3`}>
                {icon}
              </div>
              <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-gradient-to-br ${colorClasses[color]}`} />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Live signal</div>
              <div className="mt-0.5 text-sm text-slate-500">{title}</div>
            </div>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
          {trend && (
            <div className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${trendUp ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>
              {trend}
            </div>
          )}
          <div className="flex h-12 items-end gap-1.5" aria-hidden="true">
            {[34, 58, 42, 78, 54, 88].map((height, index) => (
              <span
                key={height}
                className={`w-1.5 rounded-full bg-gradient-to-t ${colorClasses[color]} opacity-${index === 5 ? "100" : "50"} transition-all duration-300 group-hover:opacity-100`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SentimentBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
