import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { formatCurrencyFull, formatDate, confidenceColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ReconciliationMatch {
  id: number;
  bankTransactionId?: number | null;
  invoiceId?: number | null;
  ledgerEntryId?: number | null;
  matchType: string;
  confidenceScore: number;
  reason: string;
  status: string;
  createdAt: string;
  bankTransaction?: {
    id: number; date: string; narration: string; amount: number;
    type: string; source: string; bankName?: string | null;
    reference?: string | null; status: string; confidenceScore: number;
    matchedInvoiceId?: number | null; note?: string | null;
  } | null;
  invoice?: {
    id: number; invoiceNumber: string; vendorName: string;
    customerName?: string | null; gstin?: string | null;
    date: string; amount: number; gstAmount?: number | null;
    type: string; paymentStatus: string; status: string;
    linkedTransactionId?: number | null;
  } | null;
}

interface RunResult {
  matchesFound: number;
  newVerified: number;
  newPotential: number;
  newUnverified: number;
  message: string;
}

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");

  const { data = [], isLoading } = useQuery<ReconciliationMatch[]>({
    queryKey: ["reconciliation"],
    queryFn: () => fetch(`${BASE}/api/reconciliation`).then(r => r.json()),
  });

  const runMutation = useMutation({
    mutationFn: () => fetch(`${BASE}/api/reconciliation/run`, { method: "POST" }).then(r => r.json()) as Promise<RunResult>,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast({ title: "Reconciliation complete", description: result.message });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/reconciliation/${id}/approve`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Match approved", description: "Transaction marked as verified." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/reconciliation/${id}/reject`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      toast({ title: "Match rejected" });
    },
  });

  const filtered = filter === "all" ? data : data.filter(m => m.status === filter);
  const pending = data.filter(m => m.status === "pending").length;
  const approved = data.filter(m => m.status === "approved").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Reconciliation Engine"
        subtitle={`${data.length} matches · ${pending} pending review · ${approved} approved`}
        actions={
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            {runMutation.isPending ? "Running…" : "Run Reconciliation"}
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {["all", "pending", "approved", "rejected"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-primary text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-16 text-center">
            <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <div className="font-medium text-muted-foreground">No matches yet</div>
            <p className="text-sm text-muted-foreground/60 mt-1">Click "Run Reconciliation" to find matches</p>
          </div>
        ) : filtered.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Match type indicator */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                m.matchType === "exact" ? "bg-success" :
                m.matchType === "potential" ? "bg-amber-400" : "bg-muted-foreground/40"
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {m.bankTransaction?.narration || `Transaction #${m.bankTransactionId}`}
                  </span>
                  {m.bankTransaction?.bankName && (
                    <span className="text-xs text-muted-foreground">· {m.bankTransaction.bankName}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{m.reason}</div>
              </div>

              {/* Confidence */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${confidenceColor(m.confidenceScore)} rounded-full`}
                    style={{ width: `${m.confidenceScore}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-5">{m.confidenceScore}</span>
              </div>

              {/* Amount */}
              {m.bankTransaction && (
                <div className="text-sm font-mono font-semibold text-right w-28 flex-shrink-0">
                  {m.bankTransaction.type === "credit" ? "+" : "-"}
                  {formatCurrencyFull(m.bankTransaction.amount)}
                </div>
              )}

              <StatusBadge status={m.status} />

              {/* Actions */}
              {m.status === "pending" && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => approveMutation.mutate(m.id)}
                    disabled={approveMutation.isPending}
                    className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                    title="Approve"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(m.id)}
                    disabled={rejectMutation.isPending}
                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                {expanded === m.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Expanded details */}
            {expanded === m.id && m.bankTransaction && (
              <div className="border-t border-border bg-muted/20 px-5 py-4 grid grid-cols-2 gap-6 text-xs">
                <div>
                  <div className="font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-[10px]">Bank Transaction</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(m.bankTransaction.date)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-mono font-semibold">{formatCurrencyFull(m.bankTransaction.amount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{m.bankTransaction.type}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{m.bankTransaction.reference || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={m.bankTransaction.status} /></div>
                  </div>
                </div>
                {m.invoice && (
                  <div>
                    <div className="font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-[10px]">Matched Invoice</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-muted-foreground">Invoice #</span><span className="font-mono">{m.invoice.invoiceNumber}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span>{m.invoice.vendorName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-mono font-semibold">{formatCurrencyFull(m.invoice.amount)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="font-mono">{m.invoice.gstAmount ? formatCurrencyFull(m.invoice.gstAmount) : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono">{m.invoice.gstin || "Missing"}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
