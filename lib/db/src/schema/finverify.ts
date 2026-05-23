import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  monthlyRevenueRange: text("monthly_revenue_range"),
  caEmail: text("ca_email"),
  gstin: text("gstin"),
  pan: text("pan"),
  financialYearStart: text("financial_year_start").notNull().default("April"),
  currency: text("currency").notNull().default("INR"),
  dataRetentionDays: integer("data_retention_days").notNull().default(365),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("founder"),
  status: text("status").notNull().default("active"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  role: text("role").notNull(),
  permission: text("permission").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const uploadBatchesTable = pgTable("upload_batches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  sourceType: text("source_type").notNull(),
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("processed"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  recordCount: integer("record_count"),
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  uploadBatchId: integer("upload_batch_id"),
  fileName: text("file_name").notNull(),
  sourceType: text("source_type").notNull(),
  mimeType: text("mime_type"),
  storageProvider: text("storage_provider").notNull().default("metadata_only"),
  storageKey: text("storage_key"),
  status: text("status").notNull().default("metadata_captured"),
  extractedTextStatus: text("extracted_text_status").notNull().default("not_started"),
  rowCount: integer("row_count"),
  detectedColumns: jsonb("detected_columns"),
  uploadedByUserId: integer("uploaded_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bankTransactionsTable = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  date: text("date").notNull(),
  narration: text("narration").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  type: text("type").notNull(),
  source: text("source").notNull().default("bank"),
  bankName: text("bank_name"),
  reference: text("reference"),
  status: text("status").notNull().default("unverified"),
  confidenceScore: integer("confidence_score").notNull().default(0),
  matchedInvoiceId: integer("matched_invoice_id"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  invoiceNumber: text("invoice_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  customerName: text("customer_name"),
  gstin: text("gstin"),
  date: text("date").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }),
  type: text("type").notNull().default("purchase"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  status: text("status").notNull().default("unverified"),
  linkedTransactionId: integer("linked_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  date: text("date").notNull(),
  ledgerName: text("ledger_name").notNull(),
  voucherNumber: text("voucher_number"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  debitCredit: text("debit_credit").notNull(),
  sourceTool: text("source_tool").notNull().default("manual"),
  status: text("status").notNull().default("unmatched"),
  matchedTransactionId: integer("matched_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payrollEntriesTable = pgTable("payroll_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  employeeName: text("employee_name").notNull(),
  month: text("month").notNull(),
  grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: text("payment_date"),
  bankReference: text("bank_reference"),
  status: text("status").notNull().default("verified"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gatewaySettlementsTable = pgTable("gateway_settlements", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  provider: text("provider").notNull(),
  settlementId: text("settlement_id").notNull(),
  grossAmount: numeric("gross_amount", { precision: 14, scale: 2 }).notNull(),
  fees: numeric("fees", { precision: 14, scale: 2 }).notNull().default("0"),
  gstOnFees: numeric("gst_on_fees", { precision: 14, scale: 2 }),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  settlementDate: text("settlement_date").notNull(),
  bankReference: text("bank_reference"),
  status: text("status").notNull().default("matched"),
  bankTransactionId: integer("bank_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reconciliationMatchesTable = pgTable("reconciliation_matches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  bankTransactionId: integer("bank_transaction_id"),
  invoiceId: integer("invoice_id"),
  ledgerEntryId: integer("ledger_entry_id"),
  matchType: text("match_type").notNull(),
  confidenceScore: integer("confidence_score").notNull().default(0),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const riskFlagsTable = pgTable("risk_flags", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  reason: text("reason").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gstRecordsTable = pgTable("gst_records", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  period: text("period").notNull(),
  sourceType: text("source_type").notNull(),
  gstin: text("gstin"),
  counterpartyName: text("counterparty_name"),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"),
  taxableValue: numeric("taxable_value", { precision: 14, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  matchStatus: text("match_status").notNull().default("unmatched"),
  riskStatus: text("risk_status").notNull().default("none"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  userId: integer("user_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const caReviewItemsTable = pgTable("ca_review_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  founderNote: text("founder_note"),
  caNote: text("ca_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUploadBatchSchema = createInsertSchema(uploadBatchesTable).omit({ id: true, uploadedAt: true });
export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissionsTable).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactionsTable).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({ id: true, createdAt: true });
export const insertPayrollEntrySchema = createInsertSchema(payrollEntriesTable).omit({ id: true, createdAt: true });
export const insertGatewaySettlementSchema = createInsertSchema(gatewaySettlementsTable).omit({ id: true, createdAt: true });
export const insertReconciliationMatchSchema = createInsertSchema(reconciliationMatchesTable).omit({ id: true, createdAt: true });
export const insertRiskFlagSchema = createInsertSchema(riskFlagsTable).omit({ id: true, createdAt: true });
export const insertCaReviewItemSchema = createInsertSchema(caReviewItemsTable).omit({ id: true, createdAt: true });
export const insertGstRecordSchema = createInsertSchema(gstRecordsTable).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true });

export type UploadBatch = typeof uploadBatchesTable.$inferSelect;
export type Company = typeof companiesTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
export type Document = typeof documentsTable.$inferSelect;
export type BankTransaction = typeof bankTransactionsTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
export type PayrollEntry = typeof payrollEntriesTable.$inferSelect;
export type GatewaySettlement = typeof gatewaySettlementsTable.$inferSelect;
export type ReconciliationMatch = typeof reconciliationMatchesTable.$inferSelect;
export type RiskFlag = typeof riskFlagsTable.$inferSelect;
export type CaReviewItem = typeof caReviewItemsTable.$inferSelect;
export type GstRecord = typeof gstRecordsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
