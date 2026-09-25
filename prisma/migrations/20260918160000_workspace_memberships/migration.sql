-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REMOVED');

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_status_idx" ON "WorkspaceMember"("userId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_role_status_idx" ON "WorkspaceMember"("workspaceId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the legacy one-workspace-per-user relationship before the
-- application starts treating memberships as authoritative.
INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "status")
SELECT 'membership_' || md5("id" || ':' || "workspaceId"), "workspaceId", "id", "role", 'ACTIVE'::"MembershipStatus"
FROM "User"
ON CONFLICT ("workspaceId", "userId") DO NOTHING;
