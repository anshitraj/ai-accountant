import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  reconciliationMatchesTable,
  bankTransactionsTable,
  invoicesTable,
  riskFlagsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetReconciliationMatchesResponse,
  RunReconciliationResponse,
  ApproveMatchResponse,
  RejectMatchResponse,
} from "@workspace/api-zod";

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
  } : null,
  invoice: inv ? {
    id: inv.id, invoiceNumber: inv.invoiceNumber, vendorName: inv.vendorName,
    customerName: inv.customerName ?? null, gstin: inv.gstin ?? null,
    date: inv.date, amount: parseFloat(inv.amount as string),
    gstAmount: inv.gstAmount ? parseFloat(inv.gstAmount as string) : null,
    type: inv.type, paymentStatus: inv.paymentStatus, status: inv.status,
    linkedTransactionId: inv.linkedTransactionId ?? null,
  } : null,
});

router.get("/reconciliation", async (req, res): Promise<void> => {
  const matches = await db.select().from(reconciliationMatchesTable).orderBy(desc(reconciliationMatchesTable.createdAt));
  const txns = await db.select().from(bankTransactionsTable);
  const invoices = await db.select().from(invoicesTable);

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

router.post("/reconciliation/run", async (req, res): Promise<void> => {
  const txns = await db.select().from(bankTransactionsTable);
  const matches = await db.select().from(reconciliationMatchesTable);

  const existingMatchedTxnIds = new Set(matches.map(m => m.bankTransactionId).filter(Boolean));
  const newMatches: typeof reconciliationMatchesTable.$inferInsert[] = [];

  for (const txn of txns) {
    if (existingMatchedTxnIds.has(txn.id)) continue;
    if (txn.status === "verified") continue;

    if (txn.confidenceScore >= 85) {
      newMatches.push({
        bankTransactionId: txn.id,
        matchType: "exact",
        confidenceScore: txn.confidenceScore,
        reason: "Auto-matched by reconciliation engine",
        status: "pending",
      });
    } else if (txn.confidenceScore >= 60) {
      newMatches.push({
        bankTransactionId: txn.id,
        matchType: "potential",
        confidenceScore: txn.confidenceScore,
        reason: "Potential match — needs review",
        status: "pending",
      });
    }
  }

  if (newMatches.length > 0) {
    await db.insert(reconciliationMatchesTable).values(newMatches);
  }

  const verified = newMatches.filter(m => m.matchType === "exact").length;
  const potential = newMatches.filter(m => m.matchType === "potential").length;

  res.json(RunReconciliationResponse.parse({
    matchesFound: newMatches.length,
    newVerified: verified,
    newPotential: potential,
    newUnverified: txns.filter(t => t.confidenceScore < 60 && !existingMatchedTxnIds.has(t.id)).length,
    message: `Reconciliation complete. Found ${newMatches.length} new matches.`,
  }));
});

router.post("/reconciliation/:id/approve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [m] = await db.update(reconciliationMatchesTable)
    .set({ status: "approved" })
    .where(eq(reconciliationMatchesTable.id, id))
    .returning();

  if (!m) { res.status(404).json({ error: "Match not found" }); return; }

  if (m.bankTransactionId) {
    await db.update(bankTransactionsTable)
      .set({ status: "verified" })
      .where(eq(bankTransactionsTable.id, m.bankTransactionId));
  }

  res.json(ApproveMatchResponse.parse(mapMatch(m)));
});

router.post("/reconciliation/:id/reject", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [m] = await db.update(reconciliationMatchesTable)
    .set({ status: "rejected" })
    .where(eq(reconciliationMatchesTable.id, id))
    .returning();

  if (!m) { res.status(404).json({ error: "Match not found" }); return; }

  res.json(RejectMatchResponse.parse(mapMatch(m)));
});

export default router;
