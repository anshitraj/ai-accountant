import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ledgerEntriesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetLedgerEntriesResponse, GetLedgerSummaryResponse } from "@workspace/api-zod";
import { getCompanyId, requirePermission } from "../middleware/authz";

const router: IRouter = Router();

async function getLedgerEntries(req: Request, res: Response): Promise<void> {
  const entries = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.companyId, getCompanyId(req))).orderBy(desc(ledgerEntriesTable.date));
  res.json(GetLedgerEntriesResponse.parse(
    entries.map(e => ({
      id: e.id,
      date: e.date,
      ledgerName: e.ledgerName,
      voucherNumber: e.voucherNumber ?? null,
      amount: parseFloat(e.amount as string),
      debitCredit: e.debitCredit,
      sourceTool: e.sourceTool,
      status: e.status,
      matchedTransactionId: e.matchedTransactionId ?? null,
    }))
  ));
}

router.get("/ledger", requirePermission("ledger.read"), getLedgerEntries);
router.get("/ledger-entries", requirePermission("ledger.read"), getLedgerEntries);

router.get("/ledger/summary", requirePermission("ledger.read"), async (req, res): Promise<void> => {
  const entries = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.companyId, getCompanyId(req)));
  const matched = entries.filter(e => e.status === "matched").length;
  const missing = entries.filter(e => e.status === "missing").length;
  const duplicates = entries.filter(e => e.status === "duplicate").length;
  const suspense = entries.filter(e => e.status === "suspense").length;
  const score = entries.length > 0 ? Math.round((matched / entries.length) * 100) : 0;

  res.json(GetLedgerSummaryResponse.parse({
    totalEntries: entries.length,
    matchedEntries: matched,
    missingEntries: missing,
    duplicateCount: duplicates,
    suspenseCount: suspense,
    matchScore: score,
  }));
});

export default router;
