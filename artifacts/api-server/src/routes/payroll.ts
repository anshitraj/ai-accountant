import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { payrollEntriesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetPayrollEntriesResponse } from "@workspace/api-zod";
import { getCompanyId, requirePermission } from "../middleware/authz";

const router: IRouter = Router();

router.get("/payroll", requirePermission("payroll.read"), async (req, res): Promise<void> => {
  const entries = await db.select().from(payrollEntriesTable).where(eq(payrollEntriesTable.companyId, getCompanyId(req))).orderBy(desc(payrollEntriesTable.createdAt));
  res.json(GetPayrollEntriesResponse.parse(
    entries.map(e => ({
      id: e.id,
      employeeName: e.employeeName,
      month: e.month,
      grossAmount: e.grossAmount ? parseFloat(e.grossAmount as string) : null,
      netAmount: parseFloat(e.netAmount as string),
      paymentDate: e.paymentDate ?? null,
      bankReference: e.bankReference ?? null,
      status: e.status,
    }))
  ));
});

export default router;
