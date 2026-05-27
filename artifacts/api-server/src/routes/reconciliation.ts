import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  reconciliationMatchesTable,
  bankTransactionsTable,
  invoicesTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  GetReconciliationMatchesResponse,
  RunReconciliationResponse,
  ApproveMatchResponse,
  RejectMatchResponse,
} from "@workspace/api-zod";
import { auditAction, getCompanyId, requirePermission } from "../middleware/authz";
import { runAndPersistReconciliation } from "../services/reconciliationRunner";

const router: IRouter = Router();

const mapMatch = (m: typeof reconciliationMatchesTable.$inferSelect, txn?: typeof bankTransactionsTable.$inferSelect | null, inv?: typeof invoicesTable.$inferSelect | null) => ({
  id: m.id,
  bankTransactionId: m.bankTransactionId ?? null,
  invoiceId: m.invoiceId ?? null,
  ledgerEntryId: m.ledgerEntryId ?? null,
  matchType: m.matchType,
  confidenceScore: m.confidenceScore,
  reason: m.reason,
  status: m.status,
  createdAt: m.createdAt.toISOString(),
  bankTransaction: txn ? {
    id: txn.id, date: txn.date, narration: txn.narration,
    amount: parseFloat(txn.amount as string), type: txn.type, source: txn.source,
    bankName: txn.bankName ?? null, reference: txn.reference ?? null,
    status: txn.status, confidenceScore: txn.confidenceScore,
    matchedInvoiceId: txn.matchedInvoiceId ?? null, note: txn.note ?? null,
  } : undefined,
  invoice: inv ? {
    id: inv.id, invoiceNumber: inv.invoiceNumber, vendorName: inv.vendorName,
    customerName: inv.customerName ?? null, gstin: inv.gstin ?? null,
    date: inv.date, amount: parseFloat(inv.amount as string),
    gstAmount: inv.gstAmount ? parseFloat(inv.gstAmount as string) : null,
    type: inv.type, paymentStatus: inv.paymentStatus, status: inv.status,
    linkedTransactionId: inv.linkedTransactionId ?? null,
  } : undefined,
});

router.get("/reconciliation", requirePermission("reconciliation.read"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const matches = await db.select().from(reconciliationMatchesTable).where(eq(reconciliationMatchesTable.companyId, companyId)).orderBy(desc(reconciliationMatchesTable.createdAt));
  const txns = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.companyId, companyId));
  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId));

  const txnMap = Object.fromEntries(txns.map(t => [t.id, t]));
  const invMap = Object.fromEntries(invoices.map(i => [i.id, i]));

  let filtered = matches;
  const { status } = req.query as { status?: string };
  if (status) filtered = filtered.filter(m => m.status === status);

  res.json(GetReconciliationMatchesResponse.parse(
    filtered.map(m => mapMatch(m,
      m.bankTransactionId ? txnMap[m.bankTransactionId] : null,
      m.invoiceId ? invMap[m.invoiceId] : null
    ))
  ));
});

async function runReconciliation(req: Request, res: Response): Promise<void> {
  const companyId = getCompanyId(req);
  const result = await runAndPersistReconciliation(companyId);

  await auditAction(req, "reconciliation.run", "reconciliation", null, { matchesFound: result.matchesFound });

  res.json(RunReconciliationResponse.parse({
    ...result,
    message: `Reconciliation complete. Found ${result.matchesFound} new rule-based matches.`,
  }));
}

async function approveMatch(req: Request, res: Response): Promise<void> {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [m] = await db.update(reconciliationMatchesTable)
    .set({ status: "approved" })
    .where(and(eq(reconciliationMatchesTable.id, id), eq(reconciliationMatchesTable.companyId, getCompanyId(req))))
    .returning();

  if (!m) { res.status(404).json({ error: "Match not found" }); return; }

  if (m.bankTransactionId) {
    await db.update(bankTransactionsTable)
      .set({ status: "verified" })
      .where(and(eq(bankTransactionsTable.id, m.bankTransactionId), eq(bankTransactionsTable.companyId, getCompanyId(req))));
  }

  await auditAction(req, "reconciliation.approved", "reconciliation", m.id);
  res.json(ApproveMatchResponse.parse(mapMatch(m)));
}

async function rejectMatch(req: Request, res: Response): Promise<void> {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [m] = await db.update(reconciliationMatchesTable)
    .set({ status: "rejected" })
    .where(and(eq(reconciliationMatchesTable.id, id), eq(reconciliationMatchesTable.companyId, getCompanyId(req))))
    .returning();

  if (!m) { res.status(404).json({ error: "Match not found" }); return; }

  await auditAction(req, "reconciliation.rejected", "reconciliation", m.id);
  res.json(RejectMatchResponse.parse(mapMatch(m)));
}

router.post("/reconciliation/run", requirePermission("reconciliation.run"), runReconciliation);
router.get("/reconciliation/run", requirePermission("reconciliation.run"), runReconciliation);
router.post("/reconciliation/:id/approve", requirePermission("reconciliation.approve"), approveMatch);
router.post("/reconciliation/:id/reject", requirePermission("reconciliation.reject"), rejectMatch);
router.post("/reconciliation/approve", requirePermission("reconciliation.approve"), (req, res) => {
  (req.params as Record<string, string>).id = String(req.body?.id ?? req.query.id ?? "");
  void approveMatch(req, res);
});
router.post("/reconciliation/reject", requirePermission("reconciliation.reject"), (req, res) => {
  (req.params as Record<string, string>).id = String(req.body?.id ?? req.query.id ?? "");
  void rejectMatch(req, res);
});

export default router;
