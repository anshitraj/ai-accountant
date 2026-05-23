import { statusColor, statusLabel } from "@/lib/format";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const riskStatuses = new Set(["gst_risk", "tds_risk", "amount_mismatch", "date_mismatch", "payroll_mismatch", "gateway_settlement_mismatch", "tds_review"]);
  const reviewStatuses = new Set(["needs_ca_review", "pending", "document_requested"]);
  const missingStatuses = new Set(["missing_invoice", "missing_gstin", "missing", "unmatched", "partial", "suspense", "fee_mismatch"]);
  const verifiedStatuses = new Set(["verified", "ca_ready", "matched", "approved", "resolved", "paid", "processed", "none", "exact"]);

  const semanticClass = riskStatuses.has(status)
    ? "bg-[var(--fv-status-risk-bg)] text-[var(--fv-status-risk-text)] border-red-200"
    : reviewStatuses.has(status)
      ? "bg-[var(--fv-status-review-bg)] text-[var(--fv-status-review-text)] border-blue-200"
      : missingStatuses.has(status)
        ? "bg-[var(--fv-status-missing-bg)] text-[var(--fv-status-missing-text)] border-amber-200"
        : verifiedStatuses.has(status)
          ? "bg-[var(--fv-status-verified-bg)] text-[var(--fv-status-verified-text)] border-emerald-200"
          : statusColor(status);

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${semanticClass} ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
