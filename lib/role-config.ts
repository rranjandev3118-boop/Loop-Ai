export type RoleKey = "ADMIN" | "ANALYST" | "VIEWER";

export const roleMeta: Record<RoleKey, { label: string; description: string; accent: string; soft: string }> = {
  ADMIN: {
    label: "ADMIN",
    description: "Full workspace control",
    accent: "bg-violet-600",
    soft: "bg-violet-500/10 text-violet-700 border-violet-200"
  },
  ANALYST: {
    label: "ANALYST",
    description: "Feedback & analysis",
    accent: "bg-sky-600",
    soft: "bg-sky-500/10 text-sky-700 border-sky-200"
  },
  VIEWER: {
    label: "VIEWER",
    description: "Read-only access",
    accent: "bg-emerald-600",
    soft: "bg-emerald-500/10 text-emerald-700 border-emerald-200"
  }
};

export const roleNavigation: Record<RoleKey, Array<{ label: string; href: string; description: string }>> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard", description: "Workspace overview" },
    { label: "Feedback", href: "/inbox", description: "Inbox & triage" },
    { label: "Analytics", href: "/trends", description: "Insights" },
    { label: "Ask LOOP", href: "/ask", description: "Grounded Q&A" },
    { label: "Reports", href: "/reports", description: "VOI reporting" },
    { label: "Team", href: "/settings", description: "Members & roles" }
  ],
  ANALYST: [
    { label: "Dashboard", href: "/dashboard", description: "Overview" },
    { label: "Feedback", href: "/inbox", description: "Inbox" },
    { label: "Analytics", href: "/trends", description: "Themes & trends" },
    { label: "Ask LOOP", href: "/ask", description: "Grounded answers" },
    { label: "Reports", href: "/reports", description: "Leadership summaries" }
  ],
  VIEWER: [
    { label: "Dashboard", href: "/dashboard", description: "Overview" },
    { label: "Feedback", href: "/inbox", description: "Read-only inbox" },
    { label: "Analytics", href: "/trends", description: "Theme analysis" },
    { label: "Ask LOOP", href: "/ask", description: "Insights" },
    { label: "Reports", href: "/reports", description: "Saved reports" }
  ]
};
