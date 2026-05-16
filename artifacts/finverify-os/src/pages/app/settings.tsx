import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Bell, Shield, Users, Save } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { getUser } from "@/lib/auth";

export default function SettingsPage() {
  const { toast } = useToast();
  const user = getUser();

  const [company, setCompany] = useState({
    name: "NovaStack Labs Pvt Ltd",
    gstin: "29AAHCN0094Q1ZF",
    pan: "AAHCN0094Q",
    cin: "U72900KA2022PTC160000",
    financialYearStart: "April",
    state: "Karnataka",
    city: "Bengaluru",
    caName: "CA Priya Sharma",
    caEmail: "ca@finverify.in",
  });

  const [notifications, setNotifications] = useState({
    riskAlerts: true,
    reconciliationComplete: true,
    caReviewRequired: true,
    weeklyReport: false,
  });

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const sections = [
    {
      id: "company",
      icon: Building2,
      label: "Company Details",
      content: (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "Company Name", key: "name" as const },
            { label: "GSTIN", key: "gstin" as const },
            { label: "PAN", key: "pan" as const },
            { label: "CIN", key: "cin" as const },
            { label: "State", key: "state" as const },
            { label: "City", key: "city" as const },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{field.label}</label>
              <input
                value={company[field.key]}
                onChange={e => setCompany(c => ({ ...c, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "ca",
      icon: Users,
      label: "CA Details",
      content: (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: "CA Name", key: "caName" as const },
            { label: "CA Email", key: "caEmail" as const },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{field.label}</label>
              <input
                value={company[field.key]}
                onChange={e => setCompany(c => ({ ...c, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "notifications",
      icon: Bell,
      label: "Notification Preferences",
      content: (
        <div className="space-y-3">
          {[
            { key: "riskAlerts" as const, label: "Risk flag alerts", desc: "Get notified when new GST/TDS risks are detected" },
            { key: "reconciliationComplete" as const, label: "Reconciliation complete", desc: "Notify when auto-reconciliation finishes" },
            { key: "caReviewRequired" as const, label: "CA review required", desc: "Notify CA when items need their attention" },
            { key: "weeklyReport" as const, label: "Weekly summary report", desc: "Receive a weekly digest of verification progress" },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <div className="text-sm font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  notifications[n.key] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                    notifications[n.key] ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "security",
      icon: Shield,
      label: "Security & Access",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium mb-0.5">Current Session</div>
            <div className="text-xs text-muted-foreground">
              Signed in as <strong>{user?.name}</strong> ({user?.role}) · {user?.email}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Two-Factor Authentication</div>
            <div className="text-xs text-muted-foreground mb-2">Add extra security with TOTP or SMS verification</div>
            <button
              onClick={() => toast({ title: "2FA setup", description: "Coming soon in v2." })}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Enable 2FA
            </button>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Data Export & GDPR</div>
            <div className="text-xs text-muted-foreground mb-2">Download all your data or request account deletion</div>
            <button
              onClick={() => toast({ title: "Export requested", description: "Your data export will be ready in 24 hours." })}
              className="text-xs px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Request data export
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your company profile and preferences"
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save changes
          </button>
        }
      />

      <div className="space-y-4">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
                <Icon className="w-4 h-4 text-primary" />
                <div className="text-sm font-semibold">{s.label}</div>
              </div>
              <div className="p-5">{s.content}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
