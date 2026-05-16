import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { uploadBatchesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { GetUploadsResponse, CreateUploadBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/uploads", async (req, res): Promise<void> => {
  const uploads = await db.select().from(uploadBatchesTable).orderBy(desc(uploadBatchesTable.uploadedAt));
  res.json(GetUploadsResponse.parse(
    uploads.map(u => ({
      id: u.id,
      companyId: u.companyId ?? null,
      sourceType: u.sourceType,
      fileName: u.fileName,
      status: u.status,
      uploadedAt: u.uploadedAt.toISOString(),
      recordCount: u.recordCount ?? null,
    }))
  ));
});

router.post("/uploads", async (req, res): Promise<void> => {
  const parsed = CreateUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [upload] = await db.insert(uploadBatchesTable).values({
    sourceType: parsed.data.sourceType,
    fileName: parsed.data.fileName,
    recordCount: parsed.data.recordCount ?? null,
    status: "processed",
  }).returning();

  res.status(201).json({
    id: upload.id,
    companyId: upload.companyId ?? null,
    sourceType: upload.sourceType,
    fileName: upload.fileName,
    status: upload.status,
    uploadedAt: upload.uploadedAt.toISOString(),
    recordCount: upload.recordCount ?? null,
  });
});

export default router;
