import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Menu,
  Puzzle,
  Search,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/app/finverify-ui";
import { getUser, logout } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Control room",
    items: [
      { label: "Overview", href: "/app/overview", icon: LayoutDashboard },
      { label: "Upload Center", href: "/app/uploads", icon: Upload },
    ],
  },
  {
    label: "Financials",
    items: [
      { label: "Transactions", href: "/app/transactions", icon: ArrowLeftRight },
      { label: "Invoices", href: "/app/invoices", icon: FileText },
      { label: "Ledger Match", href: "/app/ledger-match", icon: GitMerge },
    ],
  },
  {
    label: "Verification",
    items: [
      { label: "Reconciliation", href: "/app/reconciliation", icon: CheckSquare },
      { label: "GST / TDS Risks", href: "/app/gst-tds-risks", icon: AlertTriangle },
      { label: "Payroll", href: "/app/payroll", icon: Users },
      { label: "Gateway Settlements", href: "/app/gateway-settlements", icon: CreditCard },
    ],
  },
  {
    label: "CA workflow",
    items: [
      { label: "CA Review Queue", href: "/app/ca-review", icon: ClipboardList },
      { label: "Reports", href: "/app/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Integrations", href: "/app/integrations", icon: Puzzle },
      { label: "Settings", href: "/app/settings", icon: Settings },
    ],
  },
] as const;

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-20 items-center border-b border-border px-4", collapsed ? "justify-center" : "justify-between")}>
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <BrandMark />
          <div className="mt-1 truncate text-xs text-muted-foreground">{user.company}</div>
        </div>
        {collapsed && <BrandMark compact />}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navGroups.map(group => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.href || (location === "/app" && item.href === "/app/overview");
                return (
                  <button
                    key={item.href}
                    type="button"
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      navigate(item.href);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      collapsed && "justify-center",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {active && <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-primary" />}
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-border p-3", collapsed && "flex justify-center")}>
        {collapsed ? (
          <button type="button" onClick={handleLogout} className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.name}</div>
                <div className="mt-0.5 inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                  {user.role}
                </div>
              </div>
              <button type="button" onClick={handleLogout} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className={cn("hidden shrink-0 border-r border-border bg-card transition-all duration-200 lg:flex", collapsed ? "w-[4.5rem]" : "w-64")}>
        <Sidebar />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/35 lg:hidden"
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card lg:hidden"
            >
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            className="hidden rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="relative hidden min-w-0 max-w-xl flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Global search"
              placeholder="Search invoices, UTRs, vendors, risks..."
              className="fv-input w-full pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select aria-label="Company switcher" className="fv-input hidden w-48 md:block">
              <option>{user.company}</option>
            </select>
            <select aria-label="Month selector" className="fv-input hidden w-32 sm:block">
              <option>May 2026</option>
              <option>April 2026</option>
            </select>
            <button
              type="button"
              onClick={() => navigate("/app/uploads")}
              className="fv-button-primary hidden sm:inline-flex"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button type="button" className="relative rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
