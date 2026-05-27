import {
  bankTransactionsTable,
  db,
  gatewaySettlementsTable,
  gstRecordsTable,
  invoicesTable,
  ledgerEntriesTable,
  payrollEntriesTable,
} from "@workspace/db";
import type { ParsedFileResult } from "./fileParser";

export interface UploadImportSummary {
  table: string | null;
  inserted: number;
  skipped: number;
  notes: string[];
}

type Row = Record<string, unknown>;

const SOURCE_TO_TABLE: Record<string, UploadImportSummary["table"]> = {
  bank: "bank_transactions",
  invoices: "invoices",
  invoice: "invoices",
  tally: "ledger_entries",
  ledger: "ledger_entries",
  zoho: "invoices",
  gst: "gst_records",
  payroll: "payroll_entries",
  gateway: "gateway_settlements",
};

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function value(row: Row, aliases: string[]): string | null {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizeKey);
  for (const [key, raw] of entries) {
    if (!normalizedAliases.includes(normalizeKey(key))) continue;
    const text = String(raw ?? "").trim();
    if (text) return text;
  }
  return null;
}

function numberValue(row: Row, aliases: string[]): number | null {
  const raw = value(row, aliases);
  if (!raw) return null;
  const parsed = Number(raw.replace(/[₹,\s]/g, "").replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number | null | undefined) {
  return Math.abs(value ?? 0).toFixed(2);
}

function dateValue(row: Row, aliases: string[]) {
  const raw = value(row, aliases);
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return raw;
}

function sourceTable(sourceType: string) {
  return SOURCE_TO_TABLE[sourceType.toLowerCase()] ?? null;
}

function insertNote(table: string | null, inserted: number, skipped: number) {
  if (!table) return "No importer is available for this source type yet.";
  if (inserted > 0) return `Imported ${inserted} rows into ${table} for rule-based reconciliation.`;
  return `No importable rows found for ${table}. Check required columns and try again.`;
}

async function importBankRows(companyId: number, rows: Row[]) {
  const values = rows.flatMap(row => {
    const credit = numberValue(row, ["credit", "deposit", "paid in", "receipt", "cr"]);
    const debit = numberValue(row, ["debit", "withdrawal", "paid out", "payment", "dr"]);
    const signedAmount = numberValue(row, ["amount", "transaction amount"]);
    const amount = credit ?? debit ?? signedAmount;
    const type = credit !== null && credit > 0
      ? "credit"
      : debit !== null && debit > 0
        ? "debit"
        : signedAmount !== null && signedAmount < 0
          ? "debit"
          : "credit";
    const date = dateValue(row, ["date", "txn date", "transaction date", "value date"]);
    const narration = value(row, ["narration", "description", "particulars", "details", "remarks"]);
    if (!date || !narration || amount === null || amount === 0) return [];
    return [{
      companyId,
      date,
      narration,
      amount: money(amount),
      type,
      source: "bank",
      bankName: value(row, ["bank", "bank name", "account"]) ?? null,
      reference: value(row, ["reference", "ref", "utr", "utr no", "cheque no", "transaction id"]) ?? null,
      status: "unverified",
      confidenceScore: 0,
      note: "Imported from uploaded bank statement.",
    }];
  });
  if (values.length === 0) return 0;
  await db.insert(bankTransactionsTable).values(values);
  return values.length;
}

async function importInvoiceRows(companyId: number, rows: Row[], sourceType: string) {
  const values = rows.flatMap(row => {
    const invoiceNumber = value(row, ["invoice number", "invoice no", "invoice", "bill number", "bill no", "voucher number"]);
    const date = dateValue(row, ["date", "invoice date", "bill date"]);
    const vendorName = value(row, ["vendor", "vendor name", "supplier", "supplier name", "party", "party name", "customer", "customer name"]);
    const totalAmount = numberValue(row, ["total amount", "invoice amount", "amount", "gross amount", "total"]);
    if (!invoiceNumber || !date || !vendorName || totalAmount === null || totalAmount === 0) return [];
    const cgst = numberValue(row, ["cgst"]);
    const sgst = numberValue(row, ["sgst"]);
    const igst = numberValue(row, ["igst"]);
    const gstAmount = numberValue(row, ["gst", "tax", "tax amount", "gst amount"]) ?? ((cgst ?? 0) + (sgst ?? 0) + (igst ?? 0));
    return [{
      companyId,
      invoiceNumber,
      vendorName,
      customerName: value(row, ["customer", "customer name", "buyer", "buyer name"]) ?? null,
      gstin: value(row, ["gstin", "vendor gstin", "supplier gstin", "gst no"]) ?? null,
      date,
      amount: money(totalAmount),
      gstAmount: gstAmount > 0 ? money(gstAmount) : null,
      type: value(row, ["type", "invoice type"])?.toLowerCase().includes("sale") ? "sales" : "purchase",
      paymentStatus: "unpaid",
      status: sourceType === "invoices" ? "unverified" : "pending_reconciliation",
    }];
  });
  if (values.length === 0) return 0;
  await db.insert(invoicesTable).values(values);
  return values.length;
}

async function importLedgerRows(companyId: number, rows: Row[]) {
  const values = rows.flatMap(row => {
    const date = dateValue(row, ["date", "voucher date", "posting date"]);
    const ledgerName = value(row, ["ledger", "ledger name", "account", "account name", "particulars", "party"]);
    const debit = numberValue(row, ["debit", "dr"]);
    const credit = numberValue(row, ["credit", "cr"]);
    const amount = debit ?? credit ?? numberValue(row, ["amount", "voucher amount"]);
    if (!date || !ledgerName || amount === null || amount === 0) return [];
    return [{
      companyId,
      date,
      ledgerName,
      voucherNumber: value(row, ["voucher", "voucher no", "voucher number", "reference"]) ?? null,
      amount: money(amount),
      debitCredit: debit !== null && debit > 0 ? "debit" : credit !== null && credit > 0 ? "credit" : (value(row, ["debit credit", "dr cr", "type"]) ?? "debit").toLowerCase(),
      sourceTool: "upload",
      status: "unmatched",
    }];
  });
  if (values.length === 0) return 0;
  await db.insert(ledgerEntriesTable).values(values);
  return values.length;
}

async function importPayrollRows(companyId: number, rows: Row[]) {
  const values = rows.flatMap(row => {
    const employeeName = value(row, ["employee", "employee name", "name"]);
    const month = value(row, ["month", "pay month", "salary month", "period"]);
    const netAmount = numberValue(row, ["net amount", "net salary", "net pay", "amount"]);
    if (!employeeName || !month || netAmount === null || netAmount === 0) return [];
    return [{
      companyId,
      employeeName,
      month,
      grossAmount: numberValue(row, ["gross amount", "gross salary", "gross pay"])?.toFixed(2) ?? null,
      netAmount: money(netAmount),
      paymentDate: dateValue(row, ["payment date", "paid date", "date"]) ?? null,
      bankReference: value(row, ["bank reference", "reference", "utr"]) ?? null,
      status: "unverified",
    }];
  });
  if (values.length === 0) return 0;
  await db.insert(payrollEntriesTable).values(values);
  return values.length;
}

async function importGatewayRows(companyId: number, rows: Row[], fileName: string) {
  const providerFromName = /cashfree/i.test(fileName) ? "Cashfree" : /stripe/i.test(fileName) ? "Stripe" : /razorpay/i.test(fileName) ? "Razorpay" : null;
  const values = rows.flatMap(row => {
    const settlementId = value(row, ["settlement id", "settlement_id", "id", "reference"]);
    const netAmount = numberValue(row, ["net amount", "settled amount", "amount", "net"]);
    const settlementDate = dateValue(row, ["settlement date", "date", "paid date"]);
    if (!settlementId || netAmount === null || netAmount === 0 || !settlementDate) return [];
    return [{
      companyId,
      provider: value(row, ["provider", "gateway"]) ?? providerFromName ?? "Gateway",
      settlementId,
      grossAmount: money(numberValue(row, ["gross amount", "gross"]) ?? netAmount),
      fees: money(numberValue(row, ["fees", "fee", "charges"]) ?? 0),
      gstOnFees: numberValue(row, ["gst on fees", "tax on fees", "gst"])?.toFixed(2) ?? null,
      netAmount: money(netAmount),
      settlementDate,
      bankReference: value(row, ["bank reference", "utr", "reference"]) ?? null,
      status: "pending",
    }];
  });
  if (values.length === 0) return 0;
  await db.insert(gatewaySettlementsTable).values(values);
  return values.length;
}

async function importGstRows(companyId: number, rows: Row[]) {
  const values = rows.flatMap(row => {
    const invoiceNumber = value(row, ["invoice number", "invoice no", "inum"]);
    const period = value(row, ["period", "return period", "month"]) ?? "Uploaded period";
    const taxableValue = numberValue(row, ["taxable value", "taxable", "value"]) ?? 0;
    const gstAmount = numberValue(row, ["gst", "tax", "igst", "cgst", "sgst", "gst amount"]) ?? 0;
    if (!invoiceNumber && taxableValue === 0 && gstAmount === 0) return [];
    return [{
      companyId,
      period,
      sourceType: "uploaded_gst",
      gstin: value(row, ["gstin", "counterparty gstin", "ctin"]) ?? null,
      counterpartyName: value(row, ["counterparty", "counterparty name", "supplier", "party name"]) ?? null,
      invoiceNumber,
      invoiceDate: dateValue(row, ["invoice date", "date"]) ?? null,
      taxableValue: money(taxableValue),
      gstAmount: money(gstAmount),
      matchStatus: "unmatched",
      riskStatus: "none",
    }];
  });
  if (values.length === 0) return 0;
  await db.insert(gstRecordsTable).values(values);
  return values.length;
}

export async function ingestParsedUpload(input: {
  companyId: number;
  sourceType: string;
  fileName: string;
  parsedFile: ParsedFileResult;
}): Promise<UploadImportSummary> {
  const table = sourceTable(input.sourceType);
  const rows = input.parsedFile.parsedRows ?? [];
  if (input.parsedFile.status !== "parsed" || rows.length === 0 || !table) {
    return {
      table,
      inserted: 0,
      skipped: rows.length,
      notes: [insertNote(table, 0, rows.length)],
    };
  }

  let inserted = 0;
  if (table === "bank_transactions") inserted = await importBankRows(input.companyId, rows);
  if (table === "invoices") inserted = await importInvoiceRows(input.companyId, rows, input.sourceType);
  if (table === "ledger_entries") inserted = await importLedgerRows(input.companyId, rows);
  if (table === "payroll_entries") inserted = await importPayrollRows(input.companyId, rows);
  if (table === "gateway_settlements") inserted = await importGatewayRows(input.companyId, rows, input.fileName);
  if (table === "gst_records") inserted = await importGstRows(input.companyId, rows);

  return {
    table,
    inserted,
    skipped: Math.max(rows.length - inserted, 0),
    notes: [insertNote(table, inserted, Math.max(rows.length - inserted, 0))],
  };
}
