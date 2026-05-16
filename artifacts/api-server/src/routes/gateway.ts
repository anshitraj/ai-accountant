import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { gatewaySettlementsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetGatewaySettlementsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/gateway-settlements", async (req, res): Promise<void> => {
  const settlements = await db.select().from(gatewaySettlementsTable).orderBy(desc(gatewaySettlementsTable.settlementDate));
  res.json(GetGatewaySettlementsResponse.parse(
    settlements.map(s => ({
      id: s.id,
      provider: s.provider,
      settlementId: s.settlementId,
      grossAmount: parseFloat(s.grossAmount as string),
      fees: parseFloat(s.fees as string),
      gstOnFees: s.gstOnFees ? parseFloat(s.gstOnFees as string) : null,
      netAmount: parseFloat(s.netAmount as string),
      settlementDate: s.settlementDate,
      bankReference: s.bankReference ?? null,
      status: s.status,
      bankTransactionId: s.bankTransactionId ?? null,
    }))
  ));
});

export default router;
