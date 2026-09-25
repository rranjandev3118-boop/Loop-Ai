import test from "node:test";
import assert from "node:assert/strict";
import { hasRole, readRoles, tenantScope, writeRoles } from "@/lib/access";

test("RBAC allows analysts to write and viewers to read only", () => {
  assert.equal(hasRole("ANALYST", writeRoles), true);
  assert.equal(hasRole("VIEWER", writeRoles), false);
  assert.equal(hasRole("VIEWER", readRoles), true);
  assert.equal(hasRole("ADMIN", writeRoles), true);
});

test("tenant scope always carries the authenticated workspace", () => {
  assert.deepEqual(tenantScope("workspace-a"), { workspaceId: "workspace-a" });
  assert.notEqual(tenantScope("workspace-a").workspaceId, "workspace-b");
});

