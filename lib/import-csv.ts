import Papa from "papaparse";
import { z } from "zod";

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const importRowSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  channel: z.string().trim().min(1).max(80),
  customerLabel: z.string().trim().max(120).optional(),
  createdAt: z.string().trim().optional()
});

export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportIssue = { row: number; message: string };

export function parseImportCsv(csv: string): { rows: ImportRow[]; rowNumbers: number[]; errors: ImportIssue[]; fatalError?: string } {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  if (parsed.data.length === 0) return { rows: [], rowNumbers: [], errors: [], fatalError: "The CSV does not contain any feedback rows" };
  if (parsed.errors.length) {
    return { rows: [], rowNumbers: [], errors: [], fatalError: "The CSV contains invalid rows" };
  }
  if (parsed.data.length > MAX_IMPORT_ROWS) {
    return { rows: [], rowNumbers: [], errors: [], fatalError: `CSV imports are limited to ${MAX_IMPORT_ROWS} rows` };
  }
  const rows: ImportRow[] = [];
  const rowNumbers: number[] = [];
  const errors: ImportIssue[] = [];
  parsed.data.forEach((rawRow, index) => {
    const result = importRowSchema.safeParse({
      content: rawRow.content,
      channel: rawRow.channel,
      customerLabel: rawRow.customerLabel || undefined,
      createdAt: rawRow.createdAt || undefined
    });
    if (!result.success) {
      errors.push({ row: index + 2, message: result.error.issues.map((issue) => issue.message).join(", ") });
      return;
    }
    if (result.data.createdAt && Number.isNaN(new Date(result.data.createdAt).getTime())) {
      errors.push({ row: index + 2, message: "createdAt must be a valid date" });
      return;
    }
    rows.push(result.data);
    rowNumbers.push(index + 2);
  });
  return { rows, rowNumbers, errors };
}
