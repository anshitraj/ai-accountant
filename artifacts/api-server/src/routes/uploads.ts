import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { auditLogsTable, documentsTable, uploadBatchesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetUploadsResponse, CreateUploadBody } from "@workspace/api-zod";
import { parseUploadedFile, type ParsedFileResult } from "../services/fileParser";
import { getCompanyId, requirePermission } from "../middleware/authz";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

async function writeAuditLog(input: {
  action: string;
  companyId: number;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(auditLogsTable).values({
    companyId: input.companyId,
    actorEmail: "demo@finverify.local",
    action: input.action,
    entityType: "document",
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress,
  });
}

function mapUpload(uploadRecord: typeof uploadBatchesTable.$inferSelect) {
  return {
    id: uploadRecord.id,
    companyId: uploadRecord.companyId ?? null,
    sourceType: uploadRecord.sourceType,
    fileName: uploadRecord.fileName,
    status: uploadRecord.status,
    uploadedAt: uploadRecord.uploadedAt.toISOString(),
    recordCount: uploadRecord.recordCount ?? null,
  };
}

router.get("/uploads", requirePermission("uploads.read"), async (req, res): Promise<void> => {
  const uploads = await db.select().from(uploadBatchesTable).where(eq(uploadBatchesTable.companyId, getCompanyId(req))).orderBy(desc(uploadBatchesTable.uploadedAt));
  res.json(GetUploadsResponse.parse(uploads.map(mapUpload)));
});

router.post("/uploads", requirePermission("uploads.create"), upload.single("file"), async (req, res): Promise<void> => {
  const isMultipart = Boolean(req.file);
  const sourceType = String(isMultipart ? req.body.sourceType : req.body?.sourceType ?? "");
  const fileName = isMultipart ? req.file?.originalname ?? "uploaded-file" : req.body?.fileName;

  if (!sourceType || !fileName) {
    res.status(400).json({ error: "sourceType and fileName/file are required" });
    return;
  }

  let parsedFile: ParsedFileResult = {
    parser: "unsupported",
    rowCount: Number(req.body?.recordCount ?? 0),
    detectedColumns: [],
    status: "metadata_only",
    notes: ["JSON metadata upload. No file parser was run."],
  };

  await writeAuditLog({
    action: isMultipart ? "upload.file_received" : "upload.metadata_received",
    companyId: getCompanyId(req),
    metadata: {
      fileName,
      sourceType,
      mimeType: req.file?.mimetype ?? null,
      size: req.file?.size ?? null,
    },
    ipAddress: req.ip,
  });

  try {
    if (req.file) {
      parsedFile = await parseUploadedFile(req.file);
    } else {
      const parsed = CreateUploadBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      parsedFile = {
        ...parsedFile,
        rowCount: parsed.data.recordCount ?? 0,
      };
    }
  } catch (err) {
    await writeAuditLog({
      action: "upload.parse_failed",
      companyId: getCompanyId(req),
      metadata: {
        fileName,
        sourceType,
        error: err instanceof Error ? err.message : "Unknown parse error",
      },
      ipAddress: req.ip,
    });
    res.status(422).json({ error: "File received but parsing failed", detail: err instanceof Error ? err.message : "Unknown parse error" });
    return;
  }

  const [uploadRecord] = await db.insert(uploadBatchesTable).values({
    companyId: getCompanyId(req),
    sourceType,
    fileName,
    recordCount: parsedFile.rowCount,
    status: parsedFile.status === "parsed" ? "processed" : "metadata_only",
  }).returning();

  const [document] = await db.insert(documentsTable).values({
    companyId: 1,
    uploadBatchId: uploadRecord.id,
    fileName: uploadRecord.fileName,
    sourceType: uploadRecord.sourceType,
    mimeType: req.file?.mimetype ?? null,
    storageProvider: "metadata_only",
    storageKey: null,
    status: parsedFile.status === "parsed" ? "parsed" : "metadata_captured",
    extractedTextStatus: parsedFile.parser === "pdf" ? "text_extracted" : parsedFile.parser === "unsupported" ? "not_started" : "not_required",
    rowCount: parsedFile.rowCount,
    detectedColumns: {
      parser: parsedFile.parser,
      columns: parsedFile.detectedColumns,
      sheetNames: parsedFile.sheetNames ?? [],
      pageCount: parsedFile.pageCount ?? null,
      textPreview: parsedFile.textPreview ?? null,
      notes: parsedFile.notes,
    },
  }).returning();

  await writeAuditLog({
    action: parsedFile.status === "parsed" ? "upload.parsed" : "upload.metadata_captured",
    companyId: getCompanyId(req),
    entityId: document.id,
    metadata: {
      fileName: uploadRecord.fileName,
      sourceType: uploadRecord.sourceType,
      parser: parsedFile.parser,
      rowCount: parsedFile.rowCount,
      detectedColumns: parsedFile.detectedColumns,
      notes: parsedFile.notes,
    },
    ipAddress: req.ip,
  });

  res.status(201).json({
    ...mapUpload(uploadRecord),
    parsing: {
      documentId: document.id,
      parser: parsedFile.parser,
      rowCount: parsedFile.rowCount,
      detectedColumns: parsedFile.detectedColumns,
      sheetNames: parsedFile.sheetNames ?? [],
      pageCount: parsedFile.pageCount ?? null,
      textPreview: parsedFile.textPreview ?? null,
      notes: parsedFile.notes,
    },
  });
});

export default router;
