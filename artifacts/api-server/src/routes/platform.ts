import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  auditLogsTable,
  companiesTable,
  documentsTable,
  gstRecordsTable,
  rolePermissionsTable,
  usersTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { getCompanyId, requirePermission } from "../middleware/authz";

const router: IRouter = Router();

router.get("/company", requirePermission("settings.manage_company"), async (req, res): Promise<void> => {
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, getCompanyId(req))).limit(1);
  res.json(company ? {
    id: company.id,
    name: company.name,
    industry: company.industry,
    monthlyRevenueRange: company.monthlyRevenueRange,
    caEmail: company.caEmail,
    gstin: company.gstin,
    pan: company.pan,
    financialYearStart: company.financialYearStart,
    currency: company.currency,
    dataRetentionDays: company.dataRetentionDays,
    createdAt: company.createdAt.toISOString(),
  } : null);
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const email = String(req.body?.email ?? "").toLowerCase().trim();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (password !== "demo1234") {
    res.status(401).json({ error: "Invalid demo credentials" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.status !== "active") {
    res.status(401).json({ error: "User not found in demo workspace. Seed demo data first." });
    return;
  }

  const [company] = user.companyId
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1)
    : await db.select().from(companiesTable).orderBy(desc(companiesTable.createdAt)).limit(1);

  await db.update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  await db.insert(auditLogsTable).values({
    companyId: company?.id ?? user.companyId ?? null,
    userId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    metadata: {
      role: user.role,
      authMode: "database_backed_demo",
      note: "Demo password accepted. Replace with hashed passwords/SSO before production.",
    },
    ipAddress: req.ip,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      companyId: company?.id ?? user.companyId ?? null,
      company: company?.name ?? "NovaStack Labs Pvt Ltd",
    },
    company: company ? {
      id: company.id,
      name: company.name,
      industry: company.industry,
      monthlyRevenueRange: company.monthlyRevenueRange,
      caEmail: company.caEmail,
      gstin: company.gstin,
      pan: company.pan,
      currency: company.currency,
    } : null,
  });
});

router.get("/users", requirePermission("settings.manage_company"), async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, getCompanyId(req))).orderBy(desc(usersTable.createdAt));
  res.json(users.map(user => ({
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  })));
});

router.get("/roles", requirePermission("settings.manage_company"), async (req, res): Promise<void> => {
  const permissions = await db.select().from(rolePermissionsTable).where(eq(rolePermissionsTable.companyId, getCompanyId(req))).orderBy(rolePermissionsTable.role);
  const grouped = permissions.reduce<Record<string, Array<{ permission: string; enabled: boolean }>>>((acc, item) => {
    acc[item.role] ??= [];
    acc[item.role].push({ permission: item.permission, enabled: item.enabled });
    return acc;
  }, {});
  res.json(Object.entries(grouped).map(([role, items]) => ({
    role,
    permissions: items,
  })));
});

router.get("/documents", requirePermission("uploads.read"), async (req, res): Promise<void> => {
  const documents = await db.select().from(documentsTable).where(eq(documentsTable.companyId, getCompanyId(req))).orderBy(desc(documentsTable.createdAt));
  res.json(documents.map(document => ({
    id: document.id,
    companyId: document.companyId,
    uploadBatchId: document.uploadBatchId,
    fileName: document.fileName,
    sourceType: document.sourceType,
    mimeType: document.mimeType,
    storageProvider: document.storageProvider,
    storageKey: document.storageKey,
    status: document.status,
    extractedTextStatus: document.extractedTextStatus,
    rowCount: document.rowCount,
    detectedColumns: document.detectedColumns,
    uploadedByUserId: document.uploadedByUserId,
    createdAt: document.createdAt.toISOString(),
  })));
});

router.get("/gst-records", requirePermission("risks.read"), async (req, res): Promise<void> => {
  const records = await db.select().from(gstRecordsTable).where(eq(gstRecordsTable.companyId, getCompanyId(req))).orderBy(desc(gstRecordsTable.createdAt));
  res.json(records.map(record => ({
    id: record.id,
    companyId: record.companyId,
    period: record.period,
    sourceType: record.sourceType,
    gstin: record.gstin,
    counterpartyName: record.counterpartyName,
    invoiceNumber: record.invoiceNumber,
    invoiceDate: record.invoiceDate,
    taxableValue: parseFloat(record.taxableValue as string),
    gstAmount: parseFloat(record.gstAmount as string),
    matchStatus: record.matchStatus,
    riskStatus: record.riskStatus,
    createdAt: record.createdAt.toISOString(),
  })));
});

router.get("/audit-logs", requirePermission("settings.manage_company"), async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const logs = await db.select().from(auditLogsTable).where(eq(auditLogsTable.companyId, getCompanyId(req))).orderBy(desc(auditLogsTable.createdAt)).limit(limit);
  res.json(logs.map(log => ({
    id: log.id,
    companyId: log.companyId,
    userId: log.userId,
    actorEmail: log.actorEmail,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  })));
});

router.get("/security/posture", requirePermission("settings.manage_company"), async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const users = await db.select().from(usersTable).where(eq(usersTable.companyId, companyId));
  const documents = await db.select().from(documentsTable).where(eq(documentsTable.companyId, companyId));
  const auditLogs = await db.select().from(auditLogsTable).where(eq(auditLogsTable.companyId, companyId)).limit(1);
  res.json({
    roleBasedAccessDesign: true,
    activeUsers: users.length,
    auditLogsEnabled: true,
    auditLogEvents: auditLogs.length,
    fileStorageMode: documents.some(document => document.storageProvider !== "metadata_only") ? "configured" : "metadata_only",
    aiMode: process.env.OPENAI_API_KEY ? "ai-assisted" : "rule-based",
    directIntegrationsLive: false,
    dataExportDeleteControls: true,
    noTrainingClaim: true,
    notes: [
      "Uploaded sample/demo data is local/demo unless backend storage is configured.",
      "No direct bank/GST/Tally connection is live in this prototype.",
      "Potential risks require CA review.",
    ],
  });
});

export default router;
