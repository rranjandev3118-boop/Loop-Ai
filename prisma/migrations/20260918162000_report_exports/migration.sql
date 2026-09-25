-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportExport_reportId_createdAt_idx" ON "ReportExport"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
