import type { Role } from "@prisma/client";

export const writeRoles: Role[] = ["ADMIN", "ANALYST"];
export const readRoles: Role[] = ["ADMIN", "ANALYST", "VIEWER"];

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

export function tenantScope<T extends { workspaceId: string }>(workspaceId: string): T {
  return { workspaceId } as T;
}

