import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEMO_ACCOUNTS = [
  {
    email: "rahul@novastack.in",
    password: "demo1234",
    name: "Rahul Mehta",
    role: "founder" as const,
    company: "NovaStack Labs Pvt Ltd",
    label: "Founder View",
    desc: "Full dashboard, upload center, overview",
  },
  {
    email: "ca@finverify.in",
    password: "demo1234",
    name: "CA Priya Sharma",
    role: "ca" as const,
    company: "NovaStack Labs Pvt Ltd",
    label: "CA View",
    desc: "Review queue, flags, reports",
  },
];

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const persistLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: account.email, password: account.password }),
      });
      if (!res.ok) throw new Error("Database-backed demo login failed");
      const data = await res.json();
      login({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        company: data.user.company,
        companyId: data.user.companyId,
      });
    } catch {
      login({ email: account.email, name: account.name, role: account.role, company: account.company });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const account = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (!account) {
      setError("Invalid credentials. Use a demo account below.");
      return;
    }
    await persistLogin(account);
    navigate("/app/overview");
  };

  const quickLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    await persistLogin(account);
    navigate("/app/overview");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">FinVerify OS</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Your CA-ready<br />finance dashboard
          </h2>
          <p className="text-white/60 text-sm">
            Reconcile transactions, flag GST/TDS risks, and close books faster — all before your CA opens the file.
          </p>
        </div>
        <div className="space-y-4">
          {[
            "Auto-reconciliation with confidence scoring",
            "GST & TDS risk detection",
            "Structured CA review queue",
            "Audit-ready report export",
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3 h-3 text-primary" />
              </div>
              <span className="text-white/80 text-sm">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs">© 2026 FinVerify OS. Built for Indian startups.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">FinVerify OS</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Sign in</h1>
          <p className="text-muted-foreground text-sm mb-8">Access your NovaStack Labs workspace</p>

          {/* Demo quick login */}
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.email}
                  onClick={() => quickLogin(account)}
                  className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{account.label}</div>
                    <div className="text-xs text-muted-foreground">{account.desc}</div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{account.email}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or sign in manually</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rahul@novastack.in"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="demo1234"
                  className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              Sign in
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
