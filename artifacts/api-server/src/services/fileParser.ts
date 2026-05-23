import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";

export interface ParsedFileResult {
  parser: "csv" | "excel" | "pdf" | "unsupported";
  rowCount: number;
  detectedColumns: string[];
  sheetNames?: string[];
  pageCount?: number;
  textPreview?: string;
  status: "parsed" | "metadata_only";
  notes: string[];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells.map(cell => cell.replace(/^"|"$/g, ""));
}

export async function parseUploadedFile(file: Express.Multer.File): Promise<ParsedFileResult> {
  const extension = file.originalname.split(".").pop()?.toLowerCase();

  if (extension === "csv" || file.mimetype === "text/csv") {
    const text = file.buffer.toString("utf8");
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const detectedColumns = lines.length > 0 ? parseCsvLine(lines[0]).filter(Boolean).slice(0, 30) : [];
    return {
      parser: "csv",
      rowCount: Math.max(lines.length - 1, 0),
      detectedColumns,
      status: "parsed",
      textPreview: lines.slice(0, 4).join("\n").slice(0, 1000),
      notes: ["CSV parsed server-side for row count and detected columns."],
    };
  }

  if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    const rows = firstSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" }) : [];
    const detectedColumns = rows[0] ? Object.keys(rows[0]).slice(0, 30) : [];
    return {
      parser: "excel",
      rowCount: rows.length,
      detectedColumns,
      sheetNames: workbook.SheetNames,
      status: "parsed",
      textPreview: rows.slice(0, 3).map(row => JSON.stringify(row)).join("\n").slice(0, 1000),
      notes: ["Excel parsed server-side from the first worksheet for mapping preview."],
    };
  }

  if (extension === "pdf" || file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const lines = parsed.text.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
    const likelyColumns = lines.find((line: string) => /invoice|date|amount|gst|vendor|narration/i.test(line))
      ?.split(/\s{2,}|\t/)
      .map((column: string) => column.trim())
      .filter(Boolean)
      .slice(0, 12) ?? [];
    return {
      parser: "pdf",
      rowCount: lines.length,
      detectedColumns: likelyColumns,
      pageCount: parsed.total,
      status: "parsed",
      textPreview: parsed.text.replace(/\s+/g, " ").trim().slice(0, 1000),
      notes: ["PDF text extracted server-side. Field extraction still requires mapping or AI assistance."],
    };
  }

  return {
    parser: "unsupported",
    rowCount: 0,
    detectedColumns: [],
    status: "metadata_only",
    notes: ["Unsupported parser for this file type. Stored metadata only."],
  };
}
