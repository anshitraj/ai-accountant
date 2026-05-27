import { eq } from "drizzle-orm";
import {
  bankTransactionsTable,
  db,
  gatewaySettlementsTable,
  invoicesTable,
  ledgerEntriesTable,
  payrollEntriesTable,
  reconciliationMatchesTable,
} from "@workspace/db";
import { runFullReconciliation } from "./matchingEngine";

export async function runAndPersistReconciliation(companyId: number) {
  const txns = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.companyId, companyId));
  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId));
  const ledgerEntries = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.companyId, companyId));
  const payrollEntries = await db.select().from(payrollEntriesTable).where(eq(payrollEntriesTable.companyId, companyId));
  const gatewaySettlements = await db.select().from(gatewaySettlementsTable).where(eq(gatewaySettlementsTable.companyId, companyId));
  const existingMatches = await db.select().from(reconciliationMatchesTable).where(eq(reconciliationMatchesTable.companyId, companyId));

  const existingKeys = new Set(
    existingMatches.map(m => `${m.bankTransactionId ?? "none"}:${m.invoiceId ?? "none"}:${m.ledgerEntryId ?? "none"}:${m.matchType}`)
  );
  const reconciliation = runFullReconciliation({
    transactions: txns,
    invoices,
    ledgerEntries,
    payrollEntries,
    gatewaySettlements,
  });

  const newMatches: typeof reconciliationMatchesTable.$inferInsert[] = reconciliation.matches
    .filter(match => !existingKeys.has(`${match.bankTransactionId ?? "none"}:${match.invoiceId ?? "none"}:${match.ledgerEntryId ?? "none"}:${match.matchType}`))
    .slice(0, 50)
    .map(match => ({
      bankTransactionId: match.bankTransactionId ?? null,
      companyId,
      invoiceId: match.invoiceId ?? null,
      ledgerEntryId: match.ledgerEntryId ?? null,
      matchType: match.matchType,
      confidenceScore: match.confidenceScore,
      reason: match.reason,
      status: match.status,
    }));

  if (newMatches.length > 0) {
    await db.insert(reconciliationMatchesTable).values(newMatches);
  }

  return {
    matchesFound: newMatches.length,
    newVerified: newMatches.filter(m => (m.confidenceScore ?? 0) >= 85).length,
    newPotential: newMatches.filter(m => (m.confidenceScore ?? 0) >= 60 && (m.confidenceScore ?? 0) < 85).length,
    newUnverified: txns.filter(t => t.confidenceScore < 60).length,
  };
}
