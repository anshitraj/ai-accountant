import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Shield } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { severityColor, statusLabel } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface RiskFlag {
  id: number;
  entityType: string;
  entityId?: number | null;
  category: string;
  severity: string;
  reason: string;
  suggestedAction: string;
  status: string;
  createdAt: string;
}

export default function GstTdsRisksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");

  const { data = [], isLoading } = useQuery<RiskFlag[]>({
    queryKey: ["risks"],
    queryFn: () => fetch(`${BASE}/api/risks`).then(r => r.json()),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/risks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast({ title: "Risk resolved", description: "Flag marked as resolved." });
    },
  });

  const filtered = data.filter(r => {
    const matchSeverity = severity === "all" || r.severity === severity;
    const matchCategory = category === "all" || r.category === category;
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSeverity && matchCategory && matchStatus;
  });

  const high = data.filter(r => r.severity === "high" && r.status === "open").length;
  const medium = data.filter(r => r.severity === "medium" && r.status === "open").length;
  const low = data.filter(r => r.severity === "low" && r.status === "open").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="GST / TDS Risk Flags"
        subtitle="Proactive compliance issues detected before CA review"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "High Risk", count: high, color: "bg-red-50 border-red-200 text-red-700", dot: "bg-red-500" },
          { label: "Medium Risk", count: medium, color: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500" },
          { label: "Low Risk", count: low, color: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-500" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-xl p-4 flex items-center gap-3`}>
            <div className={`w-3 h-3 rounded-full ${s.dot} flex-shrink-0`} />
            <div>
              <div className="text-2xl font-bold">{s.count}</div>
              <div className="text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={severity}
          onChange={e => setSeverity(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          <option value="all">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="gst">GST</option>
          <option value="tds">TDS</option>
          <option value="invoice">Invoice</option>
          <option value="bank">Bank</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Risk list */}
      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <Shield className="w-10 h-10 text-success/40 mx-auto mb-3" />
          <div className="font-medium">No risks found</div>
          <p className="text-sm text-muted-foreground mt-1">All compliance flags resolved or no issues detected.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-0.5 flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold border ${severityColor(r.severity)} uppercase tracking-wide`}>
                    {r.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold">{r.reason}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">{r.category}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{r.suggestedAction}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={r.status} />
                  {r.status === "open" && (
                    <button
                      onClick={() => resolveMutation.mutate(r.id)}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-success/10 text-success font-medium rounded-lg hover:bg-success/20 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
