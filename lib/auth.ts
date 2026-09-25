import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { Role } from "@prisma/client";
import { db } from "./db";

export type AuthenticatedUser = {
  id: string;
  name: string;
  workspaceId: string;
  role: Role;
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireRole(roles: Role[]): Promise<AuthenticatedUser> {
  const session = await getSession();
  const user = session?.user as Partial<AuthenticatedUser> | undefined;
  if (!user?.id) throw new Error("UNAUTHENTICATED");
  const currentUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      role: true,
      disabledAt: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: { workspaceId: true, role: true }
      }
    }
  });
  if (!currentUser || currentUser.disabledAt) throw new Error("UNAUTHENTICATED");
  const membership = currentUser.memberships.find((item) => item.workspaceId === currentUser.workspaceId);
  if (!membership || !roles.includes(membership.role)) throw new Error("FORBIDDEN");
  return { id: currentUser.id, name: currentUser.name, workspaceId: membership.workspaceId, role: membership.role };
}
