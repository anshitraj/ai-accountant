import { Router, type IRouter } from "express";
import { seedDemoData } from "../lib/seedData";
import { SeedDemoDataResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/demo/seed", async (req, res): Promise<void> => {
  try {
    const counts = await seedDemoData();
    res.json(SeedDemoDataResponse.parse({
      success: true,
      message: "Demo data seeded successfully for NovaStack Labs Pvt Ltd",
      counts,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to seed demo data");
    res.status(500).json({ error: "Failed to seed demo data" });
  }
});

export default router;
