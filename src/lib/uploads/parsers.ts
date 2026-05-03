// Thin abstraction over CSV/XLSX so downstream ingestion code is format-agnostic.
// Returns array of plain row objects keyed by header name.

import Papa from "papaparse";
import ExcelJS from "exceljs";

export type ParsedRow = Record<string, string>;

export type ParseResult = {
  headers: string[];
  rows: ParsedRow[];
};

export async function parseUpload(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return parseXlsx(file);
  if (name.endsWith(".csv")) return parseCsv(file);
  throw new Error("Unsupported file type — only .csv and .xlsx are accepted.");
}

async function parseCsv(file: File): Promise<ParseResult> {
  const text = await file.text();
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });
  if (result.errors.length) {
    const first = result.errors[0];
    throw new Error(`CSV parse error on row ${first.row}: ${first.message}`);
  }
  const rows = result.data.filter((r) => Object.values(r).some((v) => v !== ""));
  return {
    headers: result.meta.fields ?? [],
    rows,
  };
}

async function parseXlsx(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Workbook has no worksheets.");

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "").trim();
  });

  const rows: ParsedRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const obj: ParsedRow = {};
    let hasAny = false;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h) continue;
      const cellValue = row.getCell(i + 1).value;
      const text = excelCellToString(cellValue);
      obj[h] = text;
      if (text) hasAny = true;
    }
    if (hasAny) rows.push(obj);
  });

  return { headers, rows };
}

function excelCellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("richText" in v && Array.isArray(v.richText))
      return v.richText.map((r) => r.text).join("").trim();
    if ("result" in v) return excelCellToString(v.result as ExcelJS.CellValue);
    if ("hyperlink" in v && typeof v.text === "string") return v.text.trim();
  }
  return String(v).trim();
}

export function requireColumns(headers: string[], required: string[]): string[] {
  const lower = headers.map((h) => h.toLowerCase());
  return required.filter((r) => !lower.includes(r.toLowerCase()));
}

export function getCol(row: ParsedRow, name: string): string {
  // Case-insensitive accessor — admin's column names won't always match exact case.
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === name.toLowerCase()) return row[k] ?? "";
  }
  return "";
}
