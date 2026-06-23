import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Chrome, Database, Eye, EyeOff, Github, Loader2 } from "lucide-react";
import { login } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const AUTH_TIMEOUT_MS = 12000;

type AuthMode = "signin" | "register";

interface AuthResponse {
  token: string;
  expiresAt: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: "founder" | "admin" | "ca";
    company: string;
    companyId: number | null;
  };
}

function nextRouteFor(email: string) {
  return localStorage.getItem(`finverify_onboarding_complete:${email}`) === "true" ? "/app/overview" : "/onboarding";
}

async function readAuthResponse(response: Response): Promise<AuthResponse> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Authentication failed");
  }
  return data;
}

async function authFetch(path: string, body: unknown): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).then(readAuthResponse);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Sign-in is taking too long. Please check the backend/database connection and try again.");
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const initialError = new URLSearchParams(window.location.search).get("error");
  const [error, setError] = useState(initialError ? "OAuth sign-in could not be completed. Please try again." : "");
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { name, companyName, email, password }
        : { email, password };
      const data = await authFetch(endpoint, body);

      login({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
      });
      navigate(mode === "register" ? "/onboarding" : nextRouteFor(data.user.email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isRegister = mode === "register";
  const startOAuth = (provider: "google" | "github") => {
    const returnTo = encodeURIComponent(isRegister ? "/onboarding" : "/app/overview");
    window.location.href = `${BASE}/api/auth/${provider}?returnTo=${returnTo}`;
  };

  const handleDemoLoad = async () => {
    setError("");
    setDemoLoading(true);
    try {
      const data = await authFetch("/api/auth/demo", { intent: "load_demo_workspace" });

      login({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
      });
      localStorage.setItem(`finverify_onboarding_complete:${data.user.email}`, "true");
      navigate("/app/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo workspace could not be loaded");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="fv-login-shell">
      <div className="fv-login-brand-panel">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="fv-brand-accent-bg w-7 h-7 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">FinVerify OS</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Your real finance data,<br />verified before CA review
          </h2>
          <p className="text-white/60 text-sm">
            Create your workspace, upload statements and exports, and review only the records stored in your database.
          </p>
        </div>
        <div className="space-y-4">
          {[
            "Upload-based verification from your files",
            "Database-backed users and sessions",
            "Rule-first reconciliation and risk checks",
            "Demo data loads only when you ask for it",
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="fv-text-brand-accent w-3 h-3" />
              </div>
              <span className="text-white/80 text-sm">{item}</span>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs">(c) 2026 FinVerify OS. Upload-based finance verification.</p>
      </div>

      <div className="fv-login-form-panel">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fv-login-form-card"
        >
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="fv-brand-icon w-7 h-7 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">FinVerify OS</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">{isRegister ? "Create workspace" : "Sign in"}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isRegister ? "Start with an empty database-backed workspace." : "Access your database-backed workspace."}
          </p>

          <div className="mb-6 grid grid-cols-2 rounded-xl border border-border bg-muted/40 p-1">
            {[
              { id: "signin" as const, label: "Sign in" },
              { id: "register" as const, label: "Create" },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id);
                  setError("");
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => startOAuth("google")}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              <Chrome className="h-4 w-4" />
              Google
            </button>
            <button
              type="button"
              onClick={() => startOAuth("github")}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or use email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Aarav Sharma"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Company name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Your startup Pvt Ltd"
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isRegister ? "At least 8 characters" : "Your password"}
                  minLength={isRegister ? 8 : undefined}
                  className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting || demoLoading}
              className="fv-brand-accent-bg w-full py-2.5 font-semibold rounded-lg transition-colors text-sm disabled:opacity-60"
            >
              {submitting ? "Working..." : isRegister ? "Create workspace" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Need test data?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Load NovaStack sample finance records to test uploads, reconciliation, invoices, ledgers, GST/TDS risks, payroll, gateway settlements, CA review, reports, and settings.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoLoad}
              disabled={submitting || demoLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/50 disabled:opacity-60"
            >
              {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {demoLoading ? "Loading demo workspace..." : "Load demo workspace"}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              This intentionally seeds sample records. Real signup still starts empty.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
