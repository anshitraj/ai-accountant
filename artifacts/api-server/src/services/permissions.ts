export const ALL_PERMISSIONS = [
  "overview.read",
  "transactions.read",
  "transactions.update_status",
  "invoices.read",
  "invoices.create",
  "ledger.read",
  "risks.read",
  "risks.resolve",
  "payroll.read",
  "gateway.read",
  "reports.read",
  "reports.export",
  "reconciliation.read",
  "reconciliation.run",
  "reconciliation.approve",
  "reconciliation.reject",
  "uploads.read",
  "uploads.create",
  "uploads.delete",
  "settings.manage_company",
  "ai.assist",
  "ca_review.process",
] as const;

const CA_PERMISSIONS = [
  "overview.read",
  "transactions.read",
  "invoices.read",
  "ledger.read",
  "risks.read",
  "payroll.read",
  "gateway.read",
  "reports.read",
  "reports.export",
  "reconciliation.read",
  "uploads.read",
  "ai.assist",
  "ca_review.process",
] as const;

export function defaultRolePermissions(companyId: number) {
  return [
    ...ALL_PERMISSIONS.map(permission => ({ companyId, role: "founder", permission, enabled: true })),
    ...ALL_PERMISSIONS.map(permission => ({ companyId, role: "admin", permission, enabled: true })),
    ...CA_PERMISSIONS.map(permission => ({ companyId, role: "ca", permission, enabled: true })),
  ];
}
