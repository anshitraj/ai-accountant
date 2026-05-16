import { motion } from "framer-motion";
import { Puzzle, CheckCircle, ExternalLink, Zap } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import { useToast } from "@/hooks/use-toast";

const INTEGRATIONS = [
  {
    name: "Razorpay",
    desc: "Auto-sync payment gateway settlements and reconcile with bank",
    category: "Payment Gateway",
    status: "connected",
    color: "bg-blue-50 border-blue-100",
    icon: "💳",
  },
  {
    name: "HDFC NetBanking",
    desc: "Auto-import bank statements via secure bank feed",
    category: "Bank",
    status: "connected",
    color: "bg-red-50 border-red-100",
    icon: "🏦",
  },
  {
    name: "GSTN Portal",
    desc: "Fetch GSTR-2A/2B for ITC matching and GSTIN validation",
    category: "GST",
    status: "connected",
    color: "bg-green-50 border-green-100",
    icon: "🧾",
  },
  {
    name: "Tally ERP",
    desc: "Import trial balance and ledger data for reconciliation",
    category: "Accounting",
    status: "disconnected",
    color: "bg-orange-50 border-orange-100",
    icon: "📊",
  },
  {
    name: "Zoho Books",
    desc: "Sync invoices, vendor payments, and chart of accounts",
    category: "Accounting",
    status: "disconnected",
    color: "bg-blue-50 border-blue-100",
    icon: "📚",
  },
  {
    name: "TRACES / TDS Portal",
    desc: "Validate TDS deductions with Form 26AS and challan data",
    category: "TDS",
    status: "disconnected",
    color: "bg-purple-50 border-purple-100",
    icon: "🔒",
  },
  {
    name: "Stripe",
    desc: "Import international payment settlements in INR",
    category: "Payment Gateway",
    status: "disconnected",
    color: "bg-indigo-50 border-indigo-100",
    icon: "⚡",
  },
  {
    name: "Greythr / Keka",
    desc: "Sync payroll disbursements and employee bank transfers",
    category: "Payroll",
    status: "disconnected",
    color: "bg-teal-50 border-teal-100",
    icon: "👥",
  },
];

export default function IntegrationsPage() {
  const { toast } = useToast();

  const connected = INTEGRATIONS.filter(i => i.status === "connected");
  const available = INTEGRATIONS.filter(i => i.status === "disconnected");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Integrations"
        subtitle="Connect your financial tools for automated data sync"
      />

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Connected integrations auto-sync data nightly and trigger reconciliation runs. You can also
          manually trigger a sync from each integration card.
        </p>
      </div>

      {/* Connected */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success" />
          Connected ({connected.length})
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {connected.map((int, i) => (
            <motion.div
              key={int.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`flex items-center justify-between p-4 border rounded-xl ${int.color}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <div className="text-sm font-medium">{int.name}</div>
                  <div className="text-xs text-muted-foreground">{int.desc}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{int.category}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-success font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Connected
                </div>
                <button
                  onClick={() => toast({ title: `Syncing ${int.name}`, description: "Data sync started. Usually takes 1-2 minutes." })}
                  className="text-xs px-2 py-1 border border-current/20 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sync
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Available */}
      <div>
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-muted-foreground" />
          Available Integrations ({available.length})
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {available.map((int, i) => (
            <motion.div
              key={int.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (i + connected.length) }}
              className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <div className="text-sm font-medium">{int.name}</div>
                  <div className="text-xs text-muted-foreground">{int.desc}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{int.category}</div>
                </div>
              </div>
              <button
                onClick={() => toast({ title: "Coming soon", description: `${int.name} integration available in v2.` })}
                className="flex items-center gap-1 text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Connect
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
