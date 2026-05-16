import { useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Upload, ArrowLeftRight, FileText, GitMerge,
  CheckSquare, AlertTriangle, Users, CreditCard, ClipboardList,
  BarChart3, Puzzle, Settings, LogOut, ChevronLeft, CheckCircle,
  Bell, Search, Menu
} from "lucide-react";
import { getUser, logout } from "@/lib/auth";

const navItems = [
  { label: "Overview", href: "/app/overview", icon: LayoutDashboard },
  { label: "Upload Center", href: "/app/uploads", icon: Upload },
  { type: "divider", label: "Financials" },
  { label: "Transactions", href: "/app/transactions", icon: ArrowLeftRight },
  { label: "Invoices", href: "/app/invoices", icon: FileText },
  { label: "Ledger Match", href: "/app/ledger-match", icon: GitMerge },
  { type: "divider", label: "Verification" },
  { label: "Reconciliation", href: "/app/reconciliation", icon: CheckSquare },
  { label: "GST / TDS Risks", href: "/app/gst-tds-risks", icon: AlertTriangle },
  { label: "Payroll", href: "/app/payroll", icon: Users },
  { label: "Gateway Settlements", href: "/app/gateway-settlements", icon: CreditCard },
  { type: "divider", label: "CA Workflow" },
  { label: "CA Review Queue", href: "/app/ca-review", icon: ClipboardList },
  { label: "Reports", href: "/app/reports", icon: BarChart3 },
  { type: "divider", label: "Settings" },
  { label: "Integrations", href: "/app/integrations", icon: Puzzle },
  { label: "Settings", href: "/app/settings", icon: Settings },
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 h-16 border-b border-border ${collapsed ? "justify-center" : ""}`}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-semibold text-sm leading-tight">FinVerify OS</div>
            <div className="text-xs text-muted-foreground truncate max-w-[140px]">{user.company}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item, idx) => {
          if ("type" in item && item.type === "divider") {
            if (collapsed) return <div key={idx} className="my-2 h-px bg-border mx-2" />;
            return (
              <div key={idx} className="px-3 pt-4 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{item.label}</span>
              </div>
            );
          }

          const navItem = item as { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
          const Icon = navItem.icon;
          const isActive = location === navItem.href || (location === "/app" && navItem.href === "/app/overview");

          return (
            <button
              key={navItem.href}
              onClick={() => { navigate(navItem.href); setMobileOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title={collapsed ? navItem.label : undefined}
            >
              <Icon className={`flex-shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
              {!collapsed && navItem.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className={`border-t border-border p-3 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{user.role}</div>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border transition-all duration-200 flex-shrink-0 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50 flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card/50 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => collapsed ? setCollapsed(false) : setCollapsed(true)}
            className="hidden lg:block p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded hover:bg-muted/60 text-muted-foreground"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
          </button>
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
