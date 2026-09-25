import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ReportContent = {
  summary?: string;
  executiveSummary?: string;
  topThemes?: Array<string | { name?: string; count?: number }>;
  sentimentShift?: string;
  quotes?: string[];
  recommendedActions?: string[];
};

function makePdf(title: string, period: string, content: ReportContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.fontSize(22).fillColor("#312e81").text(title);
    document.moveDown(0.5).fontSize(10).fillColor("#475569").text(period);
    document.moveDown().fontSize(13).fillColor("#0f172a").text("Executive Summary");
    document.moveDown(0.3).fontSize(11).text(content.executiveSummary ?? content.summary ?? "No executive summary was generated.");
    document.moveDown().fontSize(13).text("Theme Analysis");
    for (const theme of content.topThemes ?? []) {
      const label = typeof theme === "string" ? theme : `${theme.name ?? "Theme"} (${theme.count ?? 0})`;
      document.fontSize(11).text(`• ${label}`);
    }
    document.moveDown().fontSize(13).text("Sentiment Analysis");
    document.moveDown(0.3).fontSize(11).text(content.sentimentShift ?? "No sentiment summary was generated.");
    document.moveDown().fontSize(13).text("Key Quotes");
    for (const quote of content.quotes ?? []) document.fontSize(11).text(`“${quote}”`);
    document.moveDown().fontSize(13).text("Recommendations");
    for (const action of content.recommendedActions ?? []) document.fontSize(11).text(`• ${action}`);
    document.end();
  });
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  let exportId: string | undefined;
  try {
    const user = await requireRole(["ADMIN", "ANALYST", "VIEWER"]);
    const report = await db.report.findFirst({
      where: { id: context.params.id, workspaceId: user.workspaceId, deletedAt: null },
      select: { id: true, title: true, periodStart: true, periodEnd: true, contentJson: true }
    });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const exportRecord = await db.reportExport.create({ data: { reportId: report.id, requestedById: user.id, status: "PROCESSING" } });
    exportId = exportRecord.id;
    const pdf = await makePdf(
      report.title,
      `${report.periodStart.toISOString().slice(0, 10)} — ${report.periodEnd.toISOString().slice(0, 10)}`,
      (report.contentJson ?? {}) as ReportContent
    );
    await db.reportExport.update({ where: { id: exportId }, data: { status: "COMPLETED", completedAt: new Date() } });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="voc-report-${report.id}.pdf"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    if (exportId) await db.reportExport.update({ where: { id: exportId }, data: { status: "FAILED", errorMessage: "PDF generation failed" } }).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Unable to export report";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? "Unable to export report" : "Access denied" }, { status });
  }
}
