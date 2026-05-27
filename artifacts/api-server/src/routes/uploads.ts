import { Router, type IRouter } from "express";
import multer from "multer";
import { aiExtractionsTable, auditLogsTable, companiesTable, db, documentsTable, uploadBatchesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { GetUploadsResponse, CreateUploadBody } from "@workspace/api-zod";
import { parseUploadedFile, type ParsedFileResult } from "../services/fileParser";
import { getCompanyId, requirePermission } from "../middleware/authz";
import { retentionUntil, storeUploadedFile, type StoredObject } from "../services/storage";
import { logger } from "../lib/logger";
import { runAIJsonTask } from "../server/ai/providerRouter";
import { invoiceExtractionSchema, invoiceExtractionSchemaDescription } from "../server/ai/schemas/invoiceExtractionSchema";
import { ingestParsedUpload, type UploadImportSummary } from "../services/uploadIngestion";
import { runAndPersistReconciliation } from "../services/reconciliationRunner";

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
  userId?: number | null;
  actorEmail?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(auditLogsTable).values({
    companyId: input.companyId,
    userId: input.userId ?? null,
    actorEmail: input.actorEmail ?? "system@finverify.local",
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

function shouldRunAiExtraction(reqBody: Record<string, unknown>, sourceType: string, parsedFile: ParsedFileResult) {
  const requested = reqBody.enableAiExtraction === "true" || reqBody.enableAiExtraction === true;
  return requested && ["invoice", "invoices"].includes(sourceType) && Boolean(parsedFile.textPreview);
}

function parserForFile(file: Express.Multer.File): ParsedFileResult["parser"] {
  const extension = file.originalname.split(".").pop()?.toLowerCase();
  if (extension === "csv" || file.mimetype === "text/csv") return "csv";
  if (extension === "xlsx" || extension === "xls") return "excel";
  if (extension === "pdf" || file.mimetype === "application/pdf") return "pdf";
  return "unsupported";
}

function parsingFallback(file: Express.Multer.File, err: unknown): ParsedFileResult {
  const reason = err instanceof Error ? err.message : "Unknown parse error";
  return {
    parser: parserForFile(file),
    rowCount: 0,
    detectedColumns: [],
    status: "metadata_only",
    notes: [
      "File received and metadata captured, but parser extraction failed.",
      `Parser detail: ${reason}`,
      "Potential risk — needs CA review.",
    ],
  };
}

function extractedTextStatus(parsedFile: ParsedFileResult) {
  if (parsedFile.parser === "pdf") return parsedFile.status === "parsed" ? "text_extracted" : "extraction_failed";
  if (parsedFile.parser === "unsupported") return "not_started";
  return "not_required";
}

router.get("/uploads", requirePermission("uploads.read"), async (req, res): Promise<void> => {
  const uploads = await db.select().from(uploadBatchesTable).where(eq(uploadBatchesTable.companyId, getCompanyId(req))).orderBy(desc(uploadBatchesTable.uploadedAt));
  res.json(GetUploadsResponse.parse(uploads.map(mapUpload)));
});

router.post("/uploads", requirePermission("uploads.create"), upload.single("file"), async (req, res): Promise<void> => {
  const isMultipart = Boolean(req.file);
  const sourceType = String(isMultipart ? req.body.sourceType : req.body?.sourceType ?? "");
  const fileName = isMultipart ? req.file?.originalname ?? "uploaded-file" : req.body?.fileName;
  const companyId = getCompanyId(req);

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
    companyId,
    userId: req.auth?.userId,
    actorEmail: req.auth?.email,
    metadata: {
      fileName,
      sourceType,
      mimeType: req.file?.mimetype ?? null,
      size: req.file?.size ?? null,
    },
    ipAddress: req.ip,
  });

  let storedObject: StoredObject | null = null;
  if (req.file) {
    try {
      storedObject = await storeUploadedFile({ companyId, sourceType, file: req.file });
    } catch (err) {
      await writeAuditLog({
        action: "upload.storage_failed",
        companyId,
        userId: req.auth?.userId,
        actorEmail: req.auth?.email,
        metadata: {
          fileName,
          sourceType,
          error: err instanceof Error ? err.message : "Unknown storage error",
        },
        ipAddress: req.ip,
      });
      res.status(500).json({ error: "File storage failed", detail: err instanceof Error ? err.message : "Unknown storage error" });
      return;
    }

    try {
      parsedFile = await parseUploadedFile(req.file);
    } catch (err) {
      parsedFile = parsingFallback(req.file, err);
      await writeAuditLog({
        action: "upload.parse_failed",
        companyId,
        userId: req.auth?.userId,
        actorEmail: req.auth?.email,
        metadata: {
          fileName,
          sourceType,
          error: err instanceof Error ? err.message : "Unknown parse error",
        },
        ipAddress: req.ip,
      });
    }
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

  const [uploadRecord] = await db.insert(uploadBatchesTable).values({
    companyId,
    sourceType,
    fileName,
    recordCount: parsedFile.rowCount,
    status: parsedFile.status === "parsed" ? "processed" : "metadata_only",
  }).returning();

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);

  const [document] = await db.insert(documentsTable).values({
    companyId,
    uploadBatchId: uploadRecord.id,
    fileName: uploadRecord.fileName,
    sourceType: uploadRecord.sourceType,
    mimeType: req.file?.mimetype ?? null,
    storageProvider: storedObject?.provider ?? "metadata_only",
    storageBucket: storedObject?.bucket ?? null,
    storageRegion: storedObject?.region ?? null,
    storageKey: storedObject?.key ?? null,
    storageUrl: storedObject?.url ?? null,
    sizeBytes: storedObject?.sizeBytes ?? req.file?.size ?? null,
    checksumSha256: storedObject?.checksumSha256 ?? null,
    status: parsedFile.status === "parsed" ? "parsed" : "metadata_captured",
    extractedTextStatus: extractedTextStatus(parsedFile),
    rowCount: parsedFile.rowCount,
    detectedColumns: {
      parser: parsedFile.parser,
      columns: parsedFile.detectedColumns,
      sheetNames: parsedFile.sheetNames ?? [],
      pageCount: parsedFile.pageCount ?? null,
      textPreview: parsedFile.textPreview ?? null,
      textLength: parsedFile.textLength ?? parsedFile.textPreview?.length ?? null,
      tablesDetected: parsedFile.tablesDetected ?? 0,
      notes: parsedFile.notes,
    },
    uploadedByUserId: req.auth?.userId ?? null,
    retentionUntil: retentionUntil(company?.dataRetentionDays),
  }).returning();

  await writeAuditLog({
    action: parsedFile.status === "parsed" ? "upload.parsed" : "upload.metadata_captured",
    companyId,
    userId: req.auth?.userId,
    actorEmail: req.auth?.email,
    entityId: document.id,
    metadata: {
      fileName: uploadRecord.fileName,
      sourceType: uploadRecord.sourceType,
      parser: parsedFile.parser,
      rowCount: parsedFile.rowCount,
      detectedColumns: parsedFile.detectedColumns,
      notes: parsedFile.notes,
      storageProvider: document.storageProvider,
      storageKey: document.storageKey,
      checksumSha256: document.checksumSha256,
    },
    ipAddress: req.ip,
  });

  let imported: UploadImportSummary = {
    table: null,
    inserted: 0,
    skipped: parsedFile.parsedRows?.length ?? 0,
    notes: ["No importer ran for this upload."],
  };
  let reconciliation: Awaited<ReturnType<typeof runAndPersistReconciliation>> | null = null;
  try {
    imported = await ingestParsedUpload({
      companyId,
      sourceType: uploadRecord.sourceType,
      fileName: uploadRecord.fileName,
      parsedFile,
    });
    if (imported.inserted > 0) {
      reconciliation = await runAndPersistReconciliation(companyId);
      await writeAuditLog({
        action: "upload.rows_imported",
        companyId,
        userId: req.auth?.userId,
        actorEmail: req.auth?.email,
        entityId: document.id,
        metadata: {
          fileName: uploadRecord.fileName,
          sourceType: uploadRecord.sourceType,
          table: imported.table,
          inserted: imported.inserted,
          skipped: imported.skipped,
          matchesFound: reconciliation.matchesFound,
        },
        ipAddress: req.ip,
      });
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : "unknown" }, "Upload row import failed");
    imported = {
      table: imported.table,
      inserted: 0,
      skipped: parsedFile.parsedRows?.length ?? 0,
      notes: ["Rows were parsed, but importing them failed. Potential risk — needs CA review."],
    };
  }

  let aiExtraction: unknown = null;
  if (shouldRunAiExtraction(req.body as Record<string, unknown>, sourceType, parsedFile)) {
    const result = await runAIJsonTask({
      companyId,
      userId: req.auth?.userId,
      purpose: "invoice_extraction",
      schemaName: "invoice_extraction",
      schema: invoiceExtractionSchema,
      schemaDescription: invoiceExtractionSchemaDescription,
      input: {
        text: parsedFile.textPreview,
        fileName: uploadRecord.fileName,
        sourceType: uploadRecord.sourceType,
      },
      prompt: "Extract invoice fields from the uploaded text preview only. Return pending-review data, never verified data.",
    });
    aiExtraction = {
      provider: result.provider,
      model: result.model ?? null,
      confidence: result.confidence,
      status: "extracted_pending_review",
      source: result.provider === "rule_based" ? "deterministic rule" : "AI suggestion",
      data: result.data ?? null,
      error: result.error ?? null,
    };

    if (result.data) {
      try {
        await db.insert(aiExtractionsTable).values({
          companyId,
          uploadId: uploadRecord.id,
          entityType: "document",
          entityId: document.id,
          provider: result.provider,
          model: result.model ?? null,
          purpose: "invoice_extraction",
          extractedJson: result.data as Record<string, unknown>,
          confidence: String(result.confidence),
          status: "extracted_pending_review",
          createdBy: req.auth?.userId ?? null,
        });
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : "unknown" }, "AI extraction metadata write failed");
      }
    }
  }

  res.status(201).json({
    ...mapUpload(uploadRecord),
    parsing: {
      documentId: document.id,
      parser: parsedFile.parser,
      status: parsedFile.status,
      rowCount: parsedFile.rowCount,
      detectedColumns: parsedFile.detectedColumns,
      sheetNames: parsedFile.sheetNames ?? [],
      pageCount: parsedFile.pageCount ?? null,
      textPreview: parsedFile.textPreview ?? null,
      textLength: parsedFile.textLength ?? parsedFile.textPreview?.length ?? null,
      tablesDetected: parsedFile.tablesDetected ?? 0,
      notes: parsedFile.notes,
    },
    aiExtraction,
    imported,
    reconciliation,
  });
});

export default router;
