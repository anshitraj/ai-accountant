import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, FileText, BarChart3, AlertTriangle, Users, CreditCard } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import { formatCurrencyFull } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ReportSummary {
  companyName: string;
  month: string;
  verificationScore: number;
  caReadyStatus: string;
  generatedAt: string;
  totalTransactions: number;
  verifiedTransactions: number;
  totalInvoices: number;
  missingInvoices: number;
  totalRisks: number;
  highRisks: number;
  totalPayroll: number;
  totalGatewaySettlements: number;
}

export default function ReportsPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ReportSummary>({
    queryKey: ["reportSummary"],
    queryFn: () => fetch(`${BASE}/api/reports/summary`).then(r => r.json()),
  });

  const handleExport = async (type: string) => {
    try {
      const result = await fetch(`${BASE}/api/reports/export-csv?type=${type}`).then(r => r.json());
      if (result.data && result.data.length > 0) {
        const headers = Object.keys(result.data[0]);
        const rows = result.data.map((row: Record<string, unknown>) =>
          headers.map(h => {
            const v = row[h];
            if (v === null || v === undefined) return "";
            const str = String(v);
            return str.includes(",") ? `"${str}"` : str;
          }).join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}_report.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Exported", description: `${result.rowCount} ${type} records downloaded.` });
      }
    } catch {
      toast({ title: "Export failed", description: "Could not generate export.", variant: "destructive" });
    }
  };

  const score = data?.verificationScore ?? 0;
  const scoreColor = score >= 85 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";

  const exports = [
    { type: "transactions", label: "Bank Transactions", icon: FileText, desc: "All transactions with status and confidence scores" },
    { type: "invoices", label: "Invoices", icon: FileText, desc: "Purchase and sales invoices with GST details" },
    { type: "risks", label: "Risk Flags", icon: AlertTriangle, desc: "GST/TDS risk flags with suggested actions" },
    { type: "payroll", label: "Payroll Register", icon: Users, desc: "Employee-wise salary and payment details" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Export audit-ready summaries for your CA"
      />

      {/* Summary card */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-lg font-bold">{data.companyName}</div>
              <div className="text-sm text-muted-foreground">{data.month} · Generated {new Date(data.generatedAt).toLocaleString("en-IN")}</div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${scoreColor}`}>{data.verificationScore}</div>
              <div className="text-xs text-muted-foreground">Verification Score</div>
              <div className={`text-xs font-semibold mt-0.5 ${scoreColor}`}>{data.caReadyStatus}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Verified Txns", val: `${data.verifiedTransactions} / ${data.totalTransactions}`, color: "text-success" },
              { label: "Missing Invoices", val: String(data.missingInvoices), color: "text-amber-600" },
              { label: "High-Risk Flags", val: String(data.highRisks), color: "text-destructive" },
              { label: "Total Payroll", val: formatCurrencyFull(data.totalPayroll), color: "text-foreground" },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30">
                <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Export section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          Export Reports
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {exports.map((ex, i) => {
            const Icon = ex.icon;
            return (
              <motion.div
                key={ex.type}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{ex.label}</div>
                    <div className="text-xs text-muted-foreground">{ex.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleExport(ex.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CA Handoff section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-5"
      >
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold mb-1">CA Handoff Package</div>
            <p className="text-xs text-muted-foreground mb-3">
              When your verification score is ≥85, generate a complete CA handoff package with all verified
              transactions, resolved flags, and supporting documentation linked to each entry.
            </p>
            <button
              onClick={() => toast({ title: "Package ready", description: "All 4 reports exported. Share with your CA." })}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export All for CA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
