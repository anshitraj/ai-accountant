import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bankTransactionsTable,
  invoicesTable,
  uploadBatchesTable,
  riskFlagsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetOverviewResponse } from "@workspace/api-zod";
import { getCompanyId, requirePermission } from "../middleware/authz";

const router: IRouter = Router();

router.get("/overview", requirePermission("overview.read"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const txns = await db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.companyId, companyId));
  const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.companyId, companyId));
  const uploads = await db.select().from(uploadBatchesTable).where(eq(uploadBatchesTable.companyId, companyId)).orderBy(uploadBatchesTable.uploadedAt).limit(5);
  const risks = await db.select().from(riskFlagsTable).where(eq(riskFlagsTable.companyId, companyId));
  const openRisks = risks.filter(r => r.status === "open");

  const verified = txns.filter(t => t.status === "verified").length;
  const unverified = txns.filter(t => !["verified", "missing_invoice"].includes(t.status)).length;
  const missingInvoice = txns.filter(t => t.status === "missing_invoice").length;

  const verifiedAmount = txns
    .filter(t => t.status === "verified" && t.type === "credit")
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0);

  const unverifiedAmount = txns
    .filter(t => t.status !== "verified" && t.type === "credit")
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0);

  const score = txns.length > 0
    ? Math.round((verified / txns.length) * 100)
    : 0;

  const caReady = score >= 85 ? "Ready for CA" : score >= 60 ? "Needs Review" : "Not Ready";

  const riskByCategory: Record<string, { count: number; severity: string }> = {};
  for (const r of openRisks) {
    if (!riskByCategory[r.category]) {
      riskByCategory[r.category] = { count: 0, severity: r.severity };
    }
    riskByCategory[r.category].count++;
  }

  const monthlyProgress = [
    { month: "Jan", verified: 45, unverified: 12 },
    { month: "Feb", verified: 52, unverified: 8 },
    { month: "Mar", verified: 48, unverified: 15 },
    { month: "Apr", verified: 55, unverified: 10 },
    { month: "May", verified: verified, unverified: unverified },
  ];

  const recentUploads = uploads.map(u => ({
    id: u.id,
    companyId: u.companyId ?? null,
    sourceType: u.sourceType,
    fileName: u.fileName,
    status: u.status,
    uploadedAt: u.uploadedAt.toISOString(),
    recordCount: u.recordCount ?? null,
  }));

  const response = {
    verificationScore: score,
    totalTransactions: txns.length,
    verifiedTransactions: verified,
    unverifiedTransactions: unverified,
    missingInvoices: missingInvoice + invoices.filter(i => i.status === "unverified").length,
    riskFlags: openRisks.length,
    totalUploads: await db.select().from(uploadBatchesTable).where(eq(uploadBatchesTable.companyId, companyId)).then(r => r.length),
    caReadyStatus: caReady,
    verifiedAmount,
    unverifiedAmount,
    recentUploads,
    monthlyProgress,
    riskByCategory: Object.entries(riskByCategory).map(([category, data]) => ({
      category,
      count: data.count,
      severity: data.severity,
    })),
  };

  res.json(GetOverviewResponse.parse(response));
});

export default router;
