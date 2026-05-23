import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, Send, XCircle, Zap } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { ConfidenceBar, EmptyState, PageTransition } from "@/components/app/finverify-ui";
import { formatCurrencyFull, formatDate } from "@/lib/format";
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

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const { data = [], isLoading } = useQuery<ReconciliationMatch[]>({
    queryKey: ["reconciliation"],
    queryFn: () => fetch(`${BASE}/api/reconciliation`).then(r => r.json()),
  });

  const runMutation = useMutation({
    mutationFn: () => fetch(`${BASE}/api/reconciliation/run`, { method: "POST" }).then(r => r.json()) as Promise<RunResult>,
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast({ title: "Reconciliation complete", description: result.message });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/reconciliation/${id}/approve`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Match approved", description: "Transaction marked as verified." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/reconciliation/${id}/reject`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reconciliation"] });
      toast({ title: "Match rejected" });
    },
  });

  const filtered = filter === "all" ? data : data.filter(match => match.status === filter);
  const pending = data.filter(match => match.status === "pending").length;
  const approved = data.filter(match => match.status === "approved").length;

  return (
    <PageTransition className="mx-auto max-w-7xl">
      <PageHeader
        title="Reconciliation"
        subtitle={`${data.length} matches / ${pending} pending review / ${approved} approved. Bank transaction to invoice or ledger matching remains rules-first.`}
        actions={
          <button type="button" onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="fv-button-primary disabled:opacity-60">
            <Zap className="h-4 w-4" />
            {runMutation.isPending ? "Running..." : "Run reconciliation"}
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {["all", "pending", "approved", "rejected"].map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={filter === item ? "fv-button-primary capitalize" : "fv-button-secondary capitalize"}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No matches yet"
          description="Run reconciliation to generate suggested matches from existing bank, invoice, and ledger records."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(match => (
            <div key={match.id} className="fv-card-flat p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">{match.matchType} match</span>
                    <StatusBadge status={match.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{match.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ConfidenceBar score={match.confidenceScore} />
                  {match.status === "pending" && (
                    <>
                      <button type="button" onClick={() => approveMutation.mutate(match.id)} disabled={approveMutation.isPending} className="rounded-xl bg-success/10 p-2 text-success hover:bg-success/20" aria-label="Approve match">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => rejectMutation.mutate(match.id)} disabled={rejectMutation.isPending} className="rounded-xl bg-destructive/10 p-2 text-destructive hover:bg-destructive/20" aria-label="Reject match">
                        <XCircle className="h-4 w-4" />
                      </button>
                      <button type="button" className="rounded-xl bg-blue-50 p-2 text-blue-700 hover:bg-blue-100" aria-label="Send to CA">
                        <Send className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <DetailBlock title="Bank transaction">
                  {match.bankTransaction ? (
                    <div className="space-y-2 text-sm">
                      <div className="font-semibold">{match.bankTransaction.narration}</div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">Date</span><span>{formatDate(match.bankTransaction.date)}</span></div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">Amount</span><span className="font-mono font-semibold">{formatCurrencyFull(match.bankTransaction.amount)}</span></div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">Reference</span><span className="font-mono">{match.bankTransaction.reference || "-"}</span></div>
                    </div>
                  ) : <div className="text-sm text-muted-foreground">Transaction unavailable</div>}
                </DetailBlock>

                <DetailBlock title="Suggested match">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Confidence</span><ConfidenceBar score={match.confidenceScore} /></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Amount match</span>
                      <span className="rounded-lg bg-blue-50 px-2 py-1 font-medium text-blue-700">Date proximity</span>
                      <span className="rounded-lg bg-amber-50 px-2 py-1 font-medium text-amber-700">Name similarity</span>
                      <span className="rounded-lg bg-muted px-2 py-1 font-medium text-muted-foreground">UTR/reference</span>
                    </div>
                  </div>
                </DetailBlock>

                <DetailBlock title="Invoice / ledger">
                  {match.invoice ? (
                    <div className="space-y-2 text-sm">
                      <div className="font-mono text-xs font-semibold">{match.invoice.invoiceNumber}</div>
                      <div className="font-semibold">{match.invoice.vendorName}</div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">Amount</span><span className="font-mono font-semibold">{formatCurrencyFull(match.invoice.amount)}</span></div>
                      <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">GSTIN</span><span className="font-mono">{match.invoice.gstin || "Missing"}</span></div>
                    </div>
                  ) : <div className="text-sm text-muted-foreground">No invoice linked. Ledger candidate may need CA review.</div>}
                </DetailBlock>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
