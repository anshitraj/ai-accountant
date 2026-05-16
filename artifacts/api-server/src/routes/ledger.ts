import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ledgerEntriesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetLedgerEntriesResponse, GetLedgerSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ledger", async (req, res): Promise<void> => {
  const entries = await db.select().from(ledgerEntriesTable).orderBy(desc(ledgerEntriesTable.date));
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
});

router.get("/ledger/summary", async (req, res): Promise<void> => {
  const entries = await db.select().from(ledgerEntriesTable);
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
