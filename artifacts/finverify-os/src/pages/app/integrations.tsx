import { motion } from "framer-motion";
import { Puzzle, CheckCircle, Clock, UploadCloud } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";

const INTEGRATIONS = [
  {
    name: "CSV Upload",
    handles: "Bank statements, invoices, expenses, payroll, gateway exports",
    status: "Available",
    complexity: "Low",
    notes: "Runs locally in prototype mode with row and column mapping previews.",
  },
  {
    name: "Excel Upload",
    handles: "Tally exports, Zoho exports, payroll sheets, gateway settlements",
    status: "Upload-based",
    complexity: "Low",
    notes: "Metadata capture is available. Full XLSX parsing can be enabled with an XLSX parser.",
  },
  {
    name: "PDF/Image Invoice Upload",
    handles: "Invoice images, scanned PDFs, vendor bills",
    status: "Upload-based",
    complexity: "Medium",
    notes: "Extraction-ready placeholder. Does not claim completed OCR without a configured extractor.",
  },
  {
    name: "Tally Export Upload",
    handles: "Ledger entries, vouchers, trial balance exports",
    status: "Upload-based",
    complexity: "Medium",
    notes: "No live Tally connector in this prototype.",
  },
  {
    name: "Zoho Export Upload",
    handles: "Invoices, vendor bills, chart of accounts exports",
    status: "Upload-based",
    complexity: "Medium",
    notes: "No Zoho Books API connection is active yet.",
  },
  {
    name: "Direct Tally Connector",
    handles: "Ledgers, vouchers, masters",
    status: "Coming soon",
    complexity: "High",
    notes: "Will require customer-side setup and secure sync permissions.",
  },
  {
    name: "Zoho Books API",
    handles: "Invoices, bills, payments, contacts",
    status: "Coming soon",
    complexity: "Medium",
    notes: "OAuth/API setup planned for future versions.",
  },
  {
    name: "Razorpay / Cashfree / Stripe APIs",
    handles: "Settlements, fees, refunds, chargebacks",
    status: "Coming soon",
    complexity: "Medium",
    notes: "Current support is upload-based settlement CSV review only.",
  },
  {
    name: "GST/GSP Integration",
    handles: "GST 2B/3B checks, GSTIN validation, filing references",
    status: "Coming soon",
    complexity: "High",
    notes: "Future work. Potential risks still require CA review.",
  },
  {
    name: "Account Aggregator Bank Feed",
    handles: "Consent-based bank transaction feed",
    status: "Coming soon",
    complexity: "High",
    notes: "Prototype does not connect to live bank feeds.",
  },
  {
    name: "Gmail / WhatsApp Collection",
    handles: "Invoice and document collection",
    status: "Coming soon",
    complexity: "Medium",
    notes: "Planned document intake workflow; not active in this prototype.",
  },
];

function statusClass(status: string) {
  if (status === "Available") return "bg-green-100 text-green-800 border-green-200";
  if (status === "Upload-based") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

export default function IntegrationsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Integrations"
        subtitle="Upload-based today, direct connectors on the roadmap"
      />

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <UploadCloud className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          FinVerify OS does not claim live Tally, GST, bank, or gateway connections in this prototype.
          Available workflows are upload-based unless marked as coming soon.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration, i) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  {integration.status === "Coming soon" ? <Clock className="w-4 h-4" /> : integration.status === "Available" ? <CheckCircle className="w-4 h-4" /> : <Puzzle className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-semibold">{integration.name}</div>
                  <div className="text-xs text-muted-foreground">Setup complexity: {integration.complexity}</div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-md border text-[11px] font-medium ${statusClass(integration.status)}`}>
                {integration.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Handles:</span> {integration.handles}
            </div>
            <p className="text-xs text-muted-foreground">{integration.notes}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
