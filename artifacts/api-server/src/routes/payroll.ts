import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { payrollEntriesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetPayrollEntriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/payroll", async (req, res): Promise<void> => {
  const entries = await db.select().from(payrollEntriesTable).orderBy(desc(payrollEntriesTable.createdAt));
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
