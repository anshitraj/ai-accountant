export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    verified: "bg-green-100 text-green-800 border-green-200",
    unverified: "bg-gray-100 text-gray-700 border-gray-200",
    missing_invoice: "bg-amber-100 text-amber-800 border-amber-200",
    missing_gstin: "bg-amber-100 text-amber-800 border-amber-200",
    amount_mismatch: "bg-red-100 text-red-800 border-red-200",
    date_mismatch: "bg-red-100 text-red-800 border-red-200",
    gst_risk: "bg-red-100 text-red-800 border-red-200",
    tds_risk: "bg-red-100 text-red-800 border-red-200",
    payroll_mismatch: "bg-red-100 text-red-800 border-red-200",
    gateway_settlement_mismatch: "bg-orange-100 text-orange-800 border-orange-200",
    needs_ca_review: "bg-blue-100 text-blue-800 border-blue-200",
    ca_ready: "bg-green-100 text-green-800 border-green-200",
    duplicate: "bg-orange-100 text-orange-800 border-orange-200",
    matched: "bg-green-100 text-green-800 border-green-200",
    unmatched: "bg-amber-100 text-amber-800 border-amber-200",
    pending: "bg-blue-100 text-blue-800 border-blue-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    open: "bg-red-100 text-red-800 border-red-200",
    resolved: "bg-green-100 text-green-800 border-green-200",
    partial: "bg-amber-100 text-amber-800 border-amber-200",
    paid: "bg-green-100 text-green-800 border-green-200",
    unpaid: "bg-gray-100 text-gray-700 border-gray-200",
    missing: "bg-red-100 text-red-800 border-red-200",
    suspense: "bg-orange-100 text-orange-800 border-orange-200",
    fee_mismatch: "bg-orange-100 text-orange-800 border-orange-200",
    processed: "bg-green-100 text-green-800 border-green-200",
    document_requested: "bg-purple-100 text-purple-800 border-purple-200",
    none: "bg-green-100 text-green-800 border-green-200",
    tds_review: "bg-red-100 text-red-800 border-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-700 border-gray-200";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    verified: "Verified",
    unverified: "Unverified",
    missing_invoice: "Missing Invoice",
    missing_gstin: "Missing GSTIN",
    amount_mismatch: "Amount Mismatch",
    date_mismatch: "Date Mismatch",
    gst_risk: "Potential GST Risk",
    tds_risk: "Potential TDS Risk",
    payroll_mismatch: "Payroll Mismatch",
    gateway_settlement_mismatch: "Gateway Settlement Mismatch",
    needs_ca_review: "Needs CA Review",
    ca_ready: "CA-ready",
    duplicate: "Duplicate",
    matched: "Matched",
    unmatched: "Unmatched",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    open: "Open",
    resolved: "Resolved",
    partial: "Partial",
    paid: "Paid",
    unpaid: "Unpaid",
    missing: "Missing",
    suspense: "Suspense",
    fee_mismatch: "Fee Mismatch",
    processed: "Processed",
    partial_payment: "Partial Payment",
    exact: "Exact Match",
    potential: "Potential Match",
    document_requested: "Doc Requested",
    none: "No Risk",
    tds_review: "TDS Review",
  };
  return map[status] || status.replace(/_/g, " ");
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return map[severity] || "bg-gray-100 text-gray-700 border-gray-200";
}

export function confidenceColor(score: number): string {
  if (score >= 85) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function exportToCsv(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      const str = String(v);
      return str.includes(",") ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
