import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { riskFlagsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetRiskFlagsResponse, UpdateRiskStatusParams, UpdateRiskStatusBody, UpdateRiskStatusResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const mapRisk = (r: typeof riskFlagsTable.$inferSelect) => ({
  id: r.id,
  entityType: r.entityType,
  entityId: r.entityId ?? null,
  category: r.category,
  severity: r.severity,
  reason: r.reason,
  suggestedAction: r.suggestedAction,
  status: r.status,
  createdAt: r.createdAt.toISOString(),
});

router.get("/risks", async (req, res): Promise<void> => {
  let risks = await db.select().from(riskFlagsTable).orderBy(desc(riskFlagsTable.createdAt));
  const { severity, category, status } = req.query as { severity?: string; category?: string; status?: string };
  if (severity) risks = risks.filter(r => r.severity === severity);
  if (category) risks = risks.filter(r => r.category === category);
  if (status) risks = risks.filter(r => r.status === status);
  res.json(GetRiskFlagsResponse.parse(risks.map(mapRisk)));
});

router.patch("/risks/:id/status", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateRiskStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [r] = await db.update(riskFlagsTable)
    .set({ status: parsed.data.status })
    .where(eq(riskFlagsTable.id, id))
    .returning();

  if (!r) { res.status(404).json({ error: "Risk not found" }); return; }
  res.json(UpdateRiskStatusResponse.parse(mapRisk(r)));
});

export default router;
