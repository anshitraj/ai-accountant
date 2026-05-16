import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  CheckCircle, AlertTriangle, Upload, TrendingUp,
  ArrowUpRight, FileText, Zap
} from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import StatusBadge from "@/components/app/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLocation } from "wouter";

interface OverviewStats {
  verificationScore: number;
  totalTransactions: number;
  verifiedTransactions: number;
  unverifiedTransactions: number;
  missingInvoices: number;
  riskFlags: number;
  totalUploads: number;
  caReadyStatus: string;
  verifiedAmount: number;
  unverifiedAmount: number;
  recentUploads?: Array<{ id: number; fileName: string; sourceType: string; status: string; uploadedAt: string; recordCount?: number | null }>;
  monthlyProgress?: Array<{ month?: string; verified?: number; unverified?: number }>;
  riskByCategory?: Array<{ category?: string; count?: number; severity?: string }>;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#0F9F6E" : score >= 60 ? "#D97706" : "#DC2626";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} stroke="#E5E7EB" strokeWidth="10" fill="none" />
        <circle
          cx="72" cy="72" r={r}
          stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-muted-foreground font-medium">/ 100</div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<OverviewStats>({
    queryKey: ["overview"],
    queryFn: () => fetch(`${BASE}/api/overview`).then(r => r.json()),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-muted-foreground text-sm">Loading dashboard…</div>
      </div>
    );
  }

  const score = data.verificationScore;
  const caStatus = score >= 85 ? "Ready for CA" : score >= 60 ? "Needs Review" : "Not Ready";
  const caStatusColor = score >= 85 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";

  const stats = [
    {
      label: "Total Transactions",
      value: data.totalTransactions,
      sub: `${data.verifiedTransactions} verified`,
      icon: <ArrowUpRight className="w-4 h-4" />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Missing Invoices",
      value: data.missingInvoices,
      sub: "Needs resolution",
      icon: <FileText className="w-4 h-4" />,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Risk Flags",
      value: data.riskFlags,
      sub: "Open issues",
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Documents Uploaded",
      value: data.totalUploads,
      sub: "Bank, GST, invoices",
      icon: <Upload className="w-4 h-4" />,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const COLORS = ["#0F9F6E", "#F26B3A", "#DC2626", "#2563EB"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Overview"
        subtitle="NovaStack Labs Pvt Ltd · May 2026"
        actions={
          <button
            onClick={() => navigate("/app/uploads")}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload files
          </button>
        }
      />

      {/* Score + CA status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center"
        >
          <div className="text-sm font-semibold text-muted-foreground mb-4">Verification Score</div>
          <ScoreRing score={score} />
          <div className={`mt-3 text-sm font-semibold ${caStatusColor}`}>{caStatus}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {score >= 85
              ? "Your books are CA-ready. Proceed to handoff."
              : score >= 60
              ? "Almost there. Resolve flagged items to improve score."
              : "Several issues need attention before CA review."}
          </p>
          <button
            onClick={() => navigate("/app/reports")}
            className="mt-4 text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            View full report <ArrowUpRight className="w-3 h-3" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-card border border-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Monthly Verification Progress</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />Verified</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Unverified</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data.monthlyProgress || []} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Area type="monotone" dataKey="verified" stackId="1" stroke="#0F9F6E" fill="#0F9F6E20" strokeWidth={2} />
              <Area type="monotone" dataKey="unverified" stackId="1" stroke="#D97706" fill="#D9770620" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center`}>{s.icon}</div>
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/40" />
            </div>
            <div className="text-2xl font-bold mb-0.5">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Risk breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="text-sm font-semibold mb-4">Risk by Category</div>
          {data.riskByCategory && data.riskByCategory.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={data.riskByCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={52}
                    paddingAngle={2}
                  >
                    {data.riskByCategory.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {data.riskByCategory.map((r, idx) => (
                  <div key={r.category} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                      {r.category?.toUpperCase()}
                    </span>
                    <span className="font-medium">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">No risks flagged</div>
          )}
        </motion.div>

        {/* Amount breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="text-sm font-semibold mb-4">Amount Verification</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={[
                { name: "Verified", amount: data.verifiedAmount },
                { name: "Unverified", amount: data.unverifiedAmount },
              ]}
              margin={{ top: 0, right: 0, left: -30, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                <Cell fill="#0F9F6E" />
                <Cell fill="#D97706" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="text-sm font-semibold mb-4">Quick Actions</div>
          <div className="space-y-2">
            {[
              { label: "Upload bank statement", href: "/app/uploads", icon: Upload, color: "text-primary" },
              { label: "Run reconciliation", href: "/app/reconciliation", icon: Zap, color: "text-blue-600" },
              { label: "Review risk flags", href: "/app/gst-tds-risks", icon: AlertTriangle, color: "text-amber-600" },
              { label: "CA review queue", href: "/app/ca-review", icon: CheckCircle, color: "text-success" },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.href)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left text-sm"
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${a.color}`} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Recent uploads */}
      {data.recentUploads && data.recentUploads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Recent Uploads</div>
            <button onClick={() => navigate("/app/uploads")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {data.recentUploads.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{u.fileName}</div>
                  <div className="text-xs text-muted-foreground">{u.sourceType.replace("_", " ")} · {formatDate(u.uploadedAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  {u.recordCount && <span className="text-xs text-muted-foreground">{u.recordCount} records</span>}
                  <StatusBadge status={u.status} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
