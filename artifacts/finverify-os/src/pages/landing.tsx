import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronRight,
  CreditCard,
  Database,
  FileCheck2,
  GitMerge,
  Lock,
  ReceiptText,
  SearchCheck,
  Shield,
  Upload,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { BrandMark, SectionHeader } from "@/components/app/finverify-ui";

const problemCards = [
  "Bank statements live separately",
  "Invoices arrive on email and WhatsApp",
  "Tally/Zoho exports are incomplete",
  "GST/TDS files need checking",
  "Payroll and expenses are messy",
  "Gateway settlements do not match bank credits",
];

const modules: Array<{ title: string; description: string; icon: LucideIcon }> = [
  { title: "Bank statement reconciliation", description: "Match credits, debits, UTRs, narration, and ledger references.", icon: WalletCards },
  { title: "Invoice-to-payment matching", description: "Flag paid, unpaid, duplicate, partial, and missing invoice cases.", icon: ReceiptText },
  { title: "Tally/Zoho ledger comparison", description: "Compare uploaded exports against bank and invoice evidence.", icon: GitMerge },
  { title: "GST/TDS potential risk flags", description: "Surface items that need CA review before month-end handoff.", icon: AlertTriangle },
  { title: "Payroll verification", description: "Check salary sheets against bank outflows and employee records.", icon: Users },
  { title: "Gateway settlement matching", description: "Review fees, refunds, settlement dates, and bank credits.", icon: CreditCard },
  { title: "CA review queue", description: "Route exceptions with notes, evidence, and request status.", icon: FileCheck2 },
  { title: "CA-ready reports", description: "Export verified, missing, risk, and monthly close summaries.", icon: BarChart3 },
];

const pricing = [
  ["Starter", "₹999", "Founder-led teams cleaning monthly finance files."],
  ["Growth", "₹4,999", "Startups with bank, invoice, payroll, GST, and gateway exports."],
  ["CA Firm", "₹14,999", "CA teams reviewing multiple client workspaces."],
  ["Enterprise", "Custom", "Custom controls, workflows, retention, and deployment needs."],
];

const trustItems = [
  "Role-based access design",
  "Audit logs",
  "Data export/delete controls",
  "Rule-first verification",
  "AI optional",
  "CA review required for potential risks",
];

function HeroDashboardMockup() {
  const rows = [
    ["Razorpay settlement", "₹4,82,000", "Verified"],
    ["Vendor payout - TechStack", "₹1,18,000", "Missing invoice"],
    ["Payroll batch", "₹6,40,000", "Needs CA review"],
    ["GST 2B mismatch", "₹42,500", "Potential risk"],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.1 }}
      className="relative"
    >
      <div className="absolute -inset-8 -z-10 rounded-[36px] bg-primary/15 blur-3xl" />
      <div className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_24px_80px_rgba(16,24,40,0.14)]">
        <div className="flex h-11 items-center gap-2 border-b border-border bg-muted/60 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">Upload-based MVP</span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Finance Verification Score</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight text-primary">82</span>
                <span className="pb-2 text-sm font-semibold text-muted-foreground">/100</span>
              </div>
              <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                CA-ready status: Not ready
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right sm:w-56">
              {[
                ["Verified amount", "₹18.4L", "text-success"],
                ["Unverified amount", "₹3.2L", "text-warning"],
                ["Missing invoices", "24", "text-warning"],
                ["Potential GST/TDS risks", "6", "text-destructive"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-border bg-background p-3">
                  <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
                  <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div initial={{ width: 0 }} animate={{ width: "82%" }} transition={{ delay: 0.45, duration: 0.7 }} className="h-full rounded-full bg-primary" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[1fr_110px_130px] bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Transaction</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Status</span>
              </div>
              {rows.map(([name, amount, status]) => (
                <div key={name} className="grid grid-cols-[1fr_110px_130px] border-t border-border px-3 py-3 text-xs">
                  <span className="truncate font-medium">{name}</span>
                  <span className="text-right font-mono">{amount}</span>
                  <span className="text-right">
                    <span className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground">{status}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">Risk queue</div>
                <span className="text-xs text-muted-foreground">6 open</span>
              </div>
              <div className="space-y-2">
                {["GST amount mismatch", "Vendor payment without invoice", "Possible TDS deduction"].map(item => (
                  <div key={item} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {item}
                    <div className="mt-0.5 text-[11px] font-normal">Potential risk — needs CA review</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="fv-container flex h-16 items-center justify-between">
          <BrandMark />
          <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {["Problem", "Workflow", "Modules", "Pricing", "Security"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="transition hover:text-foreground">{item}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate("/login")} className="fv-button-ghost hidden sm:inline-flex">Login</button>
            <button type="button" onClick={() => navigate("/login")} className="fv-button-primary">
              Start free verification
            </button>
          </div>
        </div>
      </nav>

      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(16,24,40,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,24,40,0.045)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="fv-container grid min-h-[calc(100vh-64px)] gap-10 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Shield className="h-3.5 w-3.5" />
              Built for Indian startups
            </div>
            <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              Your startup's finance data, verified before it reaches your CA.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              FinVerify OS checks bank statements, invoices, Tally or Zoho exports, payroll, GST/TDS files, expenses, and payment gateway settlements - then shows what is verified, unverified, missing, risky, and CA-ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => navigate("/login")} className="fv-button-primary h-12 px-5">
                Start free verification
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => navigate("/login")} className="fv-button-secondary h-12 px-5">
                View product demo
              </button>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Current version is upload-based. Direct Tally, GST, bank, Gmail, WhatsApp, and gateway connectors are future work unless marked otherwise.
            </p>
          </motion.div>
          <HeroDashboardMockup />
        </div>
      </section>

      <section id="problem" className="fv-section-band py-20">
        <div className="fv-container">
          <SectionHeader
            eyebrow="Problem"
            title="Founders don't have an accounting problem. They have a scattered finance data problem."
            description="Before a CA can review anything, someone has to match files, ledgers, statements, exports, emails, and settlement records into one clean review queue."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problemCards.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.04 }}
                className="fv-card-flat p-5 text-sm font-semibold"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ChevronRight className="h-4 w-4" />
                </div>
                {item}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-20">
        <div className="fv-container">
          <SectionHeader eyebrow="How it works" title="Upload to CA-ready review in one rules-first workflow." />
          <div className="grid gap-3 md:grid-cols-6">
            {["Upload", "Extract", "Match", "Flag", "Review", "Export"].map((step, index) => (
              <div key={step} className="fv-card-flat p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">{index + 1}</div>
                <div className="text-sm font-semibold">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="fv-section-band py-20">
        <div className="fv-container">
          <SectionHeader
            eyebrow="Modules"
            title="A finance verification layer, not another accounting system."
            description="Each module is designed to clean and explain evidence before CA review, not to replace accounting judgment."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map(module => {
              const Icon = module.icon;
              return (
                <div key={module.title} className="fv-card-flat p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold">{module.title}</div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="fv-container grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <SectionHeader
            eyebrow="Dashboard preview"
            title="A control room for month-end finance readiness."
            description="The dashboard focuses on score, readiness, exceptions, uploads, and CA review rather than noisy accounting screens."
            className="mb-0"
          />
          <HeroDashboardMockup />
        </div>
      </section>

      <section id="pricing" className="fv-section-band py-20">
        <div className="fv-container">
          <SectionHeader eyebrow="Pricing" title="Prototype pricing for validation." description="Final pricing may change as live integrations, storage, and CA firm workflows mature." />
          <div className="grid gap-4 md:grid-cols-4">
            {pricing.map(([name, price, description]) => (
              <div key={name} className="fv-card-flat p-6">
                <div className="text-sm font-semibold">{name}</div>
                <div className="mt-4 text-3xl font-bold tracking-tight">{price}</div>
                {price !== "Custom" && <div className="mt-1 text-xs font-medium text-muted-foreground">/month</div>}
                <p className="mt-5 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="py-20">
        <div className="fv-container">
          <SectionHeader
            eyebrow="Security and trust"
            title="Designed for sensitive finance workflows."
            description="Trust comes from clear controls, auditability, and honest product boundaries."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trustItems.map(item => (
              <div key={item} className="fv-card-flat flex items-center gap-3 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.includes("AI") ? <SearchCheck className="h-4 w-4" /> : item.includes("Data") ? <Database className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </div>
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="fv-container">
          <div className="rounded-[28px] border border-border bg-card p-8 text-center shadow-[0_18px_60px_rgba(16,24,40,0.08)] sm:p-12">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Send your CA a clean review file, not a messy folder.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload finance files, resolve exceptions, and export a review-ready package with clear limitations and CA-review language.
            </p>
            <button type="button" onClick={() => navigate("/login")} className="fv-button-primary mt-7 h-12 px-5">
              Start free verification
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8">
        <div className="fv-container flex flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandMark />
            <p className="mt-2">Rule-first finance verification before CA review.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {["Product", "Security", "Pricing", "Terms", "Privacy"].map(item => <span key={item}>{item}</span>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
