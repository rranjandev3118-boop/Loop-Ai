import test from "node:test";
import assert from "node:assert/strict";
import { MAX_IMPORT_ROWS, parseImportCsv } from "@/lib/import-csv";

test("CSV import parses valid rows and reports invalid rows with source line numbers", () => {
  const result = parseImportCsv("content,channel,customerLabel,createdAt\n\"Works great\",App,Acme,2026-09-18T09:00:00.000Z\n,Support,Beta,not-a-date");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].customerLabel, "Acme");
  assert.deepEqual(result.errors.map((error) => error.row), [3]);
});

test("CSV import rejects an empty document", () => {
  assert.equal(parseImportCsv("").fatalError, "The CSV does not contain any feedback rows");
});

test("CSV import enforces the 1,000-row limit", () => {
  const csv = ["content,channel", ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `item ${i},Support`)].join("\n");
  const result = parseImportCsv(csv);
  assert.equal(result.rows.length, 0);
  assert.match(result.fatalError ?? "", /1000/);
});
