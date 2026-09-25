import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users, ShieldCheck, Crown } from "lucide-react";
import { redirect } from "next/navigation";
import { TeamManagement } from "@/components/team-management";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Settings() {
  const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
  if (user.role !== "ADMIN") redirect("/forbidden");

  const members = await db.user.findMany({
    where: { workspaceId: user.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  const isAdmin = user.role === "ADMIN";
  const canManageMembers = isAdmin;

  // Count roles
  const roleCounts = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Workspace controls
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Team Settings</h1>
          <p className="mt-1 text-slate-500">
            {isAdmin ? "Manage workspace members and roles" : "View your team members"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-slate-600">Total Members</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{members.length}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/60 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-slate-600">Admins</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{roleCounts.ADMIN || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600">Analysts</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{roleCounts.ANALYST || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-indigo-900">Role-Based Security</div>
              <div className="text-sm text-indigo-700 mt-1">
                All roles and permissions are enforced server-side. Members can only access features appropriate to their assigned role.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <span className="text-sm text-slate-500">{members.length} members</span>
          </div>
        </CardHeader>
        <CardContent>
          <TeamManagement members={members.map(({ id, name, email, role }) => ({ id, name, email, role }))} currentUserId={user.id} />
          {/* {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{member.name}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail className="w-3 h-3" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>Joined {format(new Date(member.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={member.role === "ADMIN" ? "role-admin" : member.role === "ANALYST" ? "role-analyst" : "role-viewer"}
                  >
                    {member.role}
                  </Badge>
                  {canManageMembers && member.id !== user.id && (
                    <Button variant="secondary" size="sm">
                      Manage
                    </Button>
                  )}
                </div>
              </div>
            ))} */}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium">Role Permissions</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <RoleCard
              role="ADMIN"
              description="Full workspace control with member management and administrative access"
              features={["Manage team members", "Assign roles", "Full CRUD access", "Workspace settings", "Generate reports"]}
              icon="🔒"
            />
            <RoleCard
              role="ANALYST"
              description="Feedback intelligence with ingestion, classification, and analytics"
              features={["Submit feedback", "CSV upload", "Classification", "Advanced analytics", "View reports"]}
              icon="📊"
            />
            <RoleCard
              role="VIEWER"
              description="Read-only access to insights, reports, and dashboard analytics"
              features={["View dashboard", "Read reports", "Access analytics", "View themes"]}
              icon="👁️"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({ role, description, features, icon }: {
  role: string;
  description: string;
  features: string[];
  icon: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">{role}</h3>
          </div>
          <p className="text-sm text-slate-600 mb-2">{description}</p>
          <div className="flex flex-wrap gap-1">
            {features.map((feature, index) => (
              <span key={index} className="text-xs text-slate-600 bg-white px-2 py-1 rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
