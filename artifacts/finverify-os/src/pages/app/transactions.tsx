import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Filter, Download } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { formatCurrencyFull, formatDate, confidenceColor, exportToCsv } from "@/lib/format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Transaction {
  id: number;
  date: string;
  narration: string;
  amount: number;
  type: string;
  source: string;
  bankName?: string | null;
  reference?: string | null;
  status: string;
  confidenceScore: number;
  matchedInvoiceId?: number | null;
  note?: string | null;
}

const STATUS_OPTIONS = ["all", "verified", "unverified", "missing_invoice", "amount_mismatch", "gst_risk", "tds_risk", "needs_ca_review"];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const { data = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => fetch(`${BASE}/api/transactions`).then(r => r.json()),
  });

  const filtered = data.filter(t => {
    const matchSearch = !search || t.narration.toLowerCase().includes(search.toLowerCase()) || (t.reference || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "all" || t.status === status;
    const matchType = type === "all" || t.type === type;
    return matchSearch && matchStatus && matchType;
  });

  const handleExport = () => {
    exportToCsv(filtered.map(t => ({
      Date: t.date,
      Narration: t.narration,
      Amount: t.amount,
      Type: t.type,
      Source: t.source,
      Bank: t.bankName || "",
      Reference: t.reference || "",
      Status: t.status,
      ConfidenceScore: t.confidenceScore,
    })), "transactions.csv");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Bank Transactions"
        subtitle={`${filtered.length} of ${data.length} transactions`}
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search narration or reference…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Narration</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bank</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.narration}</div>
                    {t.reference && <div className="text-xs text-muted-foreground font-mono">{t.reference}</div>}
                    {t.note && <div className="text-xs text-amber-600 mt-0.5">{t.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.bankName || t.source}</td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${t.type === "credit" ? "text-success" : "text-foreground"}`}>
                    {t.type === "credit" ? "+" : "-"}{formatCurrencyFull(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${confidenceColor(t.confidenceScore)} rounded-full`}
                          style={{ width: `${t.confidenceScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6">{t.confidenceScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
