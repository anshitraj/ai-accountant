import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bankTransactionsTable,
  invoicesTable,
  riskFlagsTable,
  payrollEntriesTable,
  gatewaySettlementsTable,
  caReviewItemsTable,
  companiesTable,
  documentsTable,
  reconciliationMatchesTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  GetReportSummaryResponse,
  ExportReportCsvResponse,
  GetCaReviewItemsResponse,
  ProcessCaReviewItemParams,
  ProcessCaReviewItemBody,
  ProcessCaReviewItemResponse,
} from "@workspace/api-zod";
import { auditAction, getCompanyId, requirePermission } from "../middleware/authz";
import { retentionUntil, storeUploadedFile } from "../services/storage";

const router: IRouter = Router();

function toCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(header => {
    const value = row[header];
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(","));
  return [headers.join(","), ...rows].join("\n");
}

router.get("/reports/summary", requirePermission("reports.read"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  const txns = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.companyId, companyId));
  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId));
  const risks = await db.select().from(riskFlagsTable).where(and(eq(riskFlagsTable.companyId, companyId), eq(riskFlagsTable.status, "open")));
  const payroll = await db.select().from(payrollEntriesTable).where(eq(payrollEntriesTable.companyId, companyId));
  const settlements = await db.select().from(gatewaySettlementsTable).where(eq(gatewaySettlementsTable.companyId, companyId));

  const verified = txns.filter(t => t.status === "verified").length;
  const score = txns.length > 0 ? Math.round((verified / txns.length) * 100) : 0;
  const caReady = score >= 85 ? "Ready for CA" : score >= 60 ? "Needs Review" : "Not Ready";
  const highRisks = risks.filter(r => r.severity === "high").length;
  const missingInvoices = txns.filter(t => t.status === "missing_invoice").length + invoices.filter(i => i.status === "unverified").length;
  const totalPayroll = payroll.reduce((sum, p) => sum + parseFloat(p.netAmount as string), 0);
  const totalGateway = settlements.reduce((sum, s) => sum + parseFloat(s.netAmount as string), 0);

  res.json(GetReportSummaryResponse.parse({
    companyName: company?.name ?? "Current workspace",
    month: new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }),
    verificationScore: score,
    caReadyStatus: caReady,
    generatedAt: new Date().toISOString(),
    totalTransactions: txns.length,
    verifiedTransactions: verified,
    totalInvoices: invoices.length,
    missingInvoices,
    totalRisks: risks.length,
    highRisks,
    totalPayroll,
    totalGatewaySettlements: totalGateway,
  }));
});

router.get("/reports/export-csv", requirePermission("reports.export"), async (req, res): Promise<void> => {
  const type = (req.query.type as string) || "transactions";
  const companyId = getCompanyId(req);
  let data: Record<string, unknown>[] = [];
  let rowCount = 0;

  if (type === "transactions") {
    const txns = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.companyId, companyId)).orderBy(desc(bankTransactionsTable.date));
    data = txns.map(t => ({
      id: t.id, date: t.date, narration: t.narration,
      amount: t.amount, type: t.type, source: t.source,
      status: t.status, confidenceScore: t.confidenceScore,
    }));
    rowCount = data.length;
  } else if (type === "risks") {
    const risks = await db.select().from(riskFlagsTable).where(eq(riskFlagsTable.companyId, companyId));
    data = risks.map(r => ({
      id: r.id, category: r.category, severity: r.severity,
      reason: r.reason, suggestedAction: r.suggestedAction, status: r.status,
    }));
    rowCount = data.length;
  } else if (type === "invoices") {
    const invs = await db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId));
    data = invs.map(i => ({
      id: i.id, invoiceNumber: i.invoiceNumber, vendorName: i.vendorName,
      gstin: i.gstin, date: i.date, amount: i.amount, gstAmount: i.gstAmount,
      paymentStatus: i.paymentStatus, status: i.status,
    }));
    rowCount = data.length;
  } else if (type === "payroll") {
    const p = await db.select().from(payrollEntriesTable).where(eq(payrollEntriesTable.companyId, companyId));
    data = p.map(e => ({
      id: e.id, employeeName: e.employeeName, month: e.month,
      grossAmount: e.grossAmount, netAmount: e.netAmount,
      paymentDate: e.paymentDate, bankReference: e.bankReference, status: e.status,
    }));
    rowCount = data.length;
  } else if (type === "reconciliation") {
    const matches = await db.select().from(reconciliationMatchesTable).where(eq(reconciliationMatchesTable.companyId, companyId));
    data = matches.map(m => ({
      id: m.id,
      bankTransactionId: m.bankTransactionId,
      invoiceId: m.invoiceId,
      ledgerEntryId: m.ledgerEntryId,
      matchType: m.matchType,
      confidenceScore: m.confidenceScore,
      reason: m.reason,
      status: m.status,
    }));
    rowCount = data.length;
  } else if (type === "missing_invoices") {
    const txns = await db.select().from(bankTransactionsTable).where(and(eq(bankTransactionsTable.companyId, companyId), eq(bankTransactionsTable.status, "missing_invoice")));
    data = txns.map(t => ({
      id: t.id,
      date: t.date,
      narration: t.narration,
      amount: t.amount,
      type: t.type,
      reference: t.reference,
      status: t.status,
    }));
    rowCount = data.length;
  } else if (type === "ca_ready") {
    const txns = await db.select().from(bankTransactionsTable).where(and(eq(bankTransactionsTable.companyId, companyId), eq(bankTransactionsTable.status, "verified")));
    data = txns.map(t => ({
      id: t.id,
      date: t.date,
      narration: t.narration,
      amount: t.amount,
      type: t.type,
      confidenceScore: t.confidenceScore,
      status: t.status,
    }));
    rowCount = data.length;
  }

  let storedExport: null | {
    documentId: number;
    storageProvider: string;
    storageKey: string | null;
    checksumSha256: string | null;
    sizeBytes: number | null;
  } = null;

  if (req.query.store === "true") {
    const fileName = `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = toCsv(data);
    const file = {
      buffer: Buffer.from(csv, "utf8"),
      originalname: fileName,
      mimetype: "text/csv",
      size: Buffer.byteLength(csv, "utf8"),
    };
    const stored = await storeUploadedFile({ companyId, sourceType: "export", file });
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
    const [document] = await db.insert(documentsTable).values({
      companyId,
      uploadBatchId: null,
      fileName,
      sourceType: "export",
      mimeType: "text/csv",
      storageProvider: stored.provider,
      storageBucket: stored.bucket,
      storageRegion: stored.region,
      storageKey: stored.key,
      storageUrl: stored.url,
      sizeBytes: stored.sizeBytes,
      checksumSha256: stored.checksumSha256,
      status: "exported",
      extractedTextStatus: "not_required",
      rowCount,
      detectedColumns: { type, columns: data.length ? Object.keys(data[0]) : [] },
      uploadedByUserId: req.auth?.userId ?? null,
      retentionUntil: retentionUntil(company?.dataRetentionDays),
    }).returning();
    storedExport = {
      documentId: document.id,
      storageProvider: document.storageProvider,
      storageKey: document.storageKey,
      checksumSha256: document.checksumSha256,
      sizeBytes: document.sizeBytes,
    };
  }

  await auditAction(req, "report.exported", "report", null, { type, rowCount, stored: Boolean(storedExport) });
  const payload = ExportReportCsvResponse.parse({
    success: true,
    message: `Exported ${rowCount} ${type} records`,
    rowCount,
    data,
  });
  res.json({ ...payload, storedExport });
});

router.get("/ca-review", requirePermission("reports.read"), async (req, res): Promise<void> => {
  const items = await db.select().from(caReviewItemsTable).where(eq(caReviewItemsTable.companyId, getCompanyId(req))).orderBy(desc(caReviewItemsTable.createdAt));
  res.json(GetCaReviewItemsResponse.parse(
    items.map(i => ({
      id: i.id,
      entityType: i.entityType,
      entityId: i.entityId ?? null,
      title: i.title,
      description: i.description ?? null,
      severity: i.severity,
      status: i.status,
      founderNote: i.founderNote ?? null,
      caNote: i.caNote ?? null,
      createdAt: i.createdAt.toISOString(),
    }))
  ));
});

router.post("/ca-review/:id/action", requirePermission("ca_review.process"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = ProcessCaReviewItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const actionToStatus: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
    request: "document_requested",
    resolve: "resolved",
  };

  const newStatus = actionToStatus[parsed.data.action] ?? "pending";
  const updateData: Record<string, string | null> = { status: newStatus };
  if (parsed.data.note) updateData.caNote = parsed.data.note;

  const [item] = await db.update(caReviewItemsTable)
    .set(updateData as any)
    .where(and(eq(caReviewItemsTable.id, id), eq(caReviewItemsTable.companyId, getCompanyId(req))))
    .returning();

  if (!item) { res.status(404).json({ error: "Review item not found" }); return; }
  await auditAction(req, "ca_review.action", "ca_review", item.id, { action: parsed.data.action, status: item.status });

  res.json(ProcessCaReviewItemResponse.parse({
    id: item.id,
    entityType: item.entityType,
    entityId: item.entityId ?? null,
    title: item.title,
    description: item.description ?? null,
    severity: item.severity,
    status: item.status,
    founderNote: item.founderNote ?? null,
    caNote: item.caNote ?? null,
    createdAt: item.createdAt.toISOString(),
  }));
});

export default router;
