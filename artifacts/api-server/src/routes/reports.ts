import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bankTransactionsTable,
  invoicesTable,
  riskFlagsTable,
  payrollEntriesTable,
  gatewaySettlementsTable,
  caReviewItemsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetReportSummaryResponse,
  ExportReportCsvResponse,
  GetCaReviewItemsResponse,
  ProcessCaReviewItemParams,
  ProcessCaReviewItemBody,
  ProcessCaReviewItemResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/summary", async (req, res): Promise<void> => {
  const txns = await db.select().from(bankTransactionsTable);
  const invoices = await db.select().from(invoicesTable);
  const risks = await db.select().from(riskFlagsTable).where(eq(riskFlagsTable.status, "open"));
  const payroll = await db.select().from(payrollEntriesTable);
  const settlements = await db.select().from(gatewaySettlementsTable);

  const verified = txns.filter(t => t.status === "verified").length;
  const score = txns.length > 0 ? Math.round((verified / txns.length) * 100) : 0;
  const caReady = score >= 85 ? "Ready for CA" : score >= 60 ? "Needs Review" : "Not Ready";
  const highRisks = risks.filter(r => r.severity === "high").length;
  const missingInvoices = txns.filter(t => t.status === "missing_invoice").length + invoices.filter(i => i.status === "unverified").length;
  const totalPayroll = payroll.reduce((sum, p) => sum + parseFloat(p.netAmount as string), 0);
  const totalGateway = settlements.reduce((sum, s) => sum + parseFloat(s.netAmount as string), 0);

  res.json(GetReportSummaryResponse.parse({
    companyName: "NovaStack Labs Pvt Ltd",
    month: "May 2026",
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

router.get("/reports/export-csv", async (req, res): Promise<void> => {
  const type = (req.query.type as string) || "transactions";
  let data: Record<string, unknown>[] = [];
  let rowCount = 0;

  if (type === "transactions") {
    const txns = await db.select().from(bankTransactionsTable).orderBy(desc(bankTransactionsTable.date));
    data = txns.map(t => ({
      id: t.id, date: t.date, narration: t.narration,
      amount: t.amount, type: t.type, source: t.source,
      status: t.status, confidenceScore: t.confidenceScore,
    }));
    rowCount = data.length;
  } else if (type === "risks") {
    const risks = await db.select().from(riskFlagsTable);
    data = risks.map(r => ({
      id: r.id, category: r.category, severity: r.severity,
      reason: r.reason, suggestedAction: r.suggestedAction, status: r.status,
    }));
    rowCount = data.length;
  } else if (type === "invoices") {
    const invs = await db.select().from(invoicesTable);
    data = invs.map(i => ({
      id: i.id, invoiceNumber: i.invoiceNumber, vendorName: i.vendorName,
      gstin: i.gstin, date: i.date, amount: i.amount, gstAmount: i.gstAmount,
      paymentStatus: i.paymentStatus, status: i.status,
    }));
    rowCount = data.length;
  } else if (type === "payroll") {
    const p = await db.select().from(payrollEntriesTable);
    data = p.map(e => ({
      id: e.id, employeeName: e.employeeName, month: e.month,
      grossAmount: e.grossAmount, netAmount: e.netAmount,
      paymentDate: e.paymentDate, bankReference: e.bankReference, status: e.status,
    }));
    rowCount = data.length;
  }

  res.json(ExportReportCsvResponse.parse({
    success: true,
    message: `Exported ${rowCount} ${type} records`,
    rowCount,
    data,
  }));
});

router.get("/ca-review", async (req, res): Promise<void> => {
  const items = await db.select().from(caReviewItemsTable).orderBy(desc(caReviewItemsTable.createdAt));
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

router.post("/ca-review/:id/action", async (req, res): Promise<void> => {
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
    .where(eq(caReviewItemsTable.id, id))
    .returning();

  if (!item) { res.status(404).json({ error: "Review item not found" }); return; }

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
