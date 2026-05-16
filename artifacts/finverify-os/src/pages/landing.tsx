import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { CheckCircle, Shield, FileText, BarChart3, ArrowRight, Zap, Lock, TrendingUp } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();

  const features = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Smart Document Upload",
      desc: "Drag-and-drop bank statements, invoices, and ledgers. Auto-parsed and categorized instantly.",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "AI Reconciliation Engine",
      desc: "Automatically matches transactions to invoices with confidence scoring. Flags mismatches before your CA does.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "GST & TDS Risk Flags",
      desc: "Proactive detection of GST mismatches, missing GSTIN, and TDS deduction gaps — with suggested actions.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "CA Review Queue",
      desc: "Structured review interface for your CA. Comment threads, document requests, and one-click approvals.",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Verification Score",
      desc: "A real-time readiness score that tells you exactly how prepared your books are for CA sign-off.",
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Audit-Ready Reports",
      desc: "Export clean summaries in CSV/PDF — structured for CA workflows and regulatory filings.",
    },
  ];

  const steps = [
    { num: "01", title: "Upload your financials", desc: "Bank statements, invoices, and GST ledgers" },
    { num: "02", title: "Engine reconciles automatically", desc: "Matches, flags, and scores every transaction" },
    { num: "03", title: "Review and resolve", desc: "Fix issues flagged before your CA even opens the file" },
    { num: "04", title: "CA signs off faster", desc: "Hand over a verified, audit-ready package" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base text-foreground">FinVerify OS</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-sm px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block mb-4 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20 uppercase tracking-wide">
              Pre-CA Finance Verification
            </span>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-foreground">
              Stop surprising your CA.<br />
              <span className="text-primary">Verify before you file.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              FinVerify OS helps Indian startups reconcile bank transactions, flag GST/TDS risks,
              and prepare audit-ready books — before handing off to your CA.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 bg-primary text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                See demo workspace
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-6 py-3 bg-background border border-border text-foreground font-semibold rounded-xl hover:bg-muted/50 transition-colors"
              >
                View sample report
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-8 grid grid-cols-3 gap-8 text-center"
          >
            {[
              { val: "87%", label: "Average CA turnaround time reduction" },
              { val: "₹2.3L", label: "Average missed ITC recovered per quarter" },
              { val: "3×", label: "Faster book closure for funded startups" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-primary mb-1">{s.val}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything your startup needs before CA review</h2>
            <p className="text-muted-foreground">Purpose-built for Indian startups with complex GST, TDS, and multi-bank setups</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground">From raw financials to CA-ready books in four steps</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex gap-4 items-start"
              >
                <div className="text-3xl font-bold text-primary/20 w-10 flex-shrink-0">{step.num}</div>
                <div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to close books faster?</h2>
          <p className="text-muted-foreground mb-8">
            Join 200+ funded Indian startups already using FinVerify OS to eliminate last-minute CA surprises.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-8 py-3.5 bg-primary text-white font-semibold rounded-xl flex items-center gap-2 mx-auto hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            Try the demo workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
            <span>FinVerify OS</span>
          </div>
          <span>© 2026 FinVerify OS. Built for Indian startups.</span>
        </div>
      </footer>
    </div>
  );
}
