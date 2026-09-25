import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { classifyAndPersist } from "@/lib/classification";
import { MAX_IMPORT_BYTES, parseImportCsv } from "@/lib/import-csv";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRole(["ADMIN", "ANALYST"]);
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A CSV file is required" }, { status: 400 });
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "CSV files must be smaller than 5 MB" }, { status: 413 });
    }

    const csv = await file.text();
    const parsed = parseImportCsv(csv);
    if (parsed.fatalError) return NextResponse.json({ error: parsed.fatalError }, { status: 400 });

    const createdIds: string[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    for (let index = 0; index < parsed.rows.length; index += 1) {
      const row = parsed.rows[index];
      const sourceRow = parsed.rowNumbers[index];
      const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
      const feedback = await db.feedback.create({
        data: { ...row, createdAt, workspaceId: user.workspaceId }
      });
      try {
        await classifyAndPersist(feedback.id, user.workspaceId);
        createdIds.push(feedback.id);
      } catch (error) {
        await db.feedback.deleteMany({ where: { id: feedback.id, workspaceId: user.workspaceId } });
        errors.push({ row: sourceRow, message: "Classification failed; row was not saved" });
        console.error("CSV feedback classification failed", error);
      }
    }
    errors.push(...parsed.errors);

    return NextResponse.json({
      imported: createdIds.length,
      failed: errors.length,
      total: parsed.rows.length + parsed.errors.length,
      success: errors.length === 0,
      errors
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import CSV";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 400;
    return NextResponse.json({ error: status === 400 ? "Unable to import CSV" : "Access denied" }, { status });
  }
}
