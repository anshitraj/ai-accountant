import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GitMerge } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { formatCurrencyFull, formatDate } from "@/lib/format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LedgerEntry {
  id: number;
  date: string;
  accountName: string;
  accountCode?: string | null;
  description: string;
  debitAmount?: number | null;
  creditAmount?: number | null;
  balance?: number | null;
  status: string;
  linkedTransactionId?: number | null;
  linkedInvoiceId?: number | null;
}

export default function LedgerMatchPage() {
  const { data = [], isLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["ledger"],
    queryFn: () => fetch(`${BASE}/api/ledger`).then(r => r.json()),
  });

  const matched = data.filter(e => e.status === "matched").length;
  const unmatched = data.filter(e => e.status === "unmatched").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Ledger Match"
        subtitle={`${data.length} ledger entries · ${matched} matched · ${unmatched} unmatched`}
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Matched", count: matched, color: "bg-success text-white" },
          { label: "Unmatched", count: unmatched, color: "bg-amber-500 text-white" },
          { label: "Total", count: data.length, color: "bg-muted text-foreground border border-border" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className={`text-sm ${s.color.includes("muted") ? "text-muted-foreground" : "opacity-80"}`}>{s.label}</div>
          </div>
        ))}
      </div>

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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <GitMerge className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <div className="text-muted-foreground">No ledger entries</div>
                  </td>
                </tr>
              ) : data.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{e.accountName}</div>
                    {e.accountCode && <div className="text-xs font-mono text-muted-foreground">{e.accountCode}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.description}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">
                    {e.debitAmount ? formatCurrencyFull(e.debitAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-success">
                    {e.creditAmount ? formatCurrencyFull(e.creditAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {e.balance != null ? formatCurrencyFull(e.balance) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
