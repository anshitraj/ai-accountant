import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import AppShell from "@/components/app/AppShell";
import OverviewPage from "@/pages/app/overview";
import UploadsPage from "@/pages/app/uploads";
import TransactionsPage from "@/pages/app/transactions";
import InvoicesPage from "@/pages/app/invoices";
import LedgerMatchPage from "@/pages/app/ledger-match";
import ReconciliationPage from "@/pages/app/reconciliation";
import GstTdsRisksPage from "@/pages/app/gst-tds-risks";
import PayrollPage from "@/pages/app/payroll";
import GatewaySettlementsPage from "@/pages/app/gateway-settlements";
import CaReviewPage from "@/pages/app/ca-review";
import ReportsPage from "@/pages/app/reports";
import IntegrationsPage from "@/pages/app/integrations";
import SettingsPage from "@/pages/app/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function withShell(Component: React.ComponentType) {
  return function WrappedWithShell() {
    return (
      <AppShell>
        <Component />
      </AppShell>
    );
  };
}

const OverviewWithShell = withShell(OverviewPage);
const UploadsWithShell = withShell(UploadsPage);
const TransactionsWithShell = withShell(TransactionsPage);
const InvoicesWithShell = withShell(InvoicesPage);
const LedgerMatchWithShell = withShell(LedgerMatchPage);
const ReconciliationWithShell = withShell(ReconciliationPage);
const GstTdsRisksWithShell = withShell(GstTdsRisksPage);
const PayrollWithShell = withShell(PayrollPage);
const GatewaySettlementsWithShell = withShell(GatewaySettlementsPage);
const CaReviewWithShell = withShell(CaReviewPage);
const ReportsWithShell = withShell(ReportsPage);
const IntegrationsWithShell = withShell(IntegrationsPage);
const SettingsWithShell = withShell(SettingsPage);

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/app" component={OverviewWithShell} />
      <Route path="/app/overview" component={OverviewWithShell} />
      <Route path="/app/uploads" component={UploadsWithShell} />
      <Route path="/app/transactions" component={TransactionsWithShell} />
      <Route path="/app/invoices" component={InvoicesWithShell} />
      <Route path="/app/ledger-match" component={LedgerMatchWithShell} />
      <Route path="/app/reconciliation" component={ReconciliationWithShell} />
      <Route path="/app/gst-tds-risks" component={GstTdsRisksWithShell} />
      <Route path="/app/payroll" component={PayrollWithShell} />
      <Route path="/app/gateway-settlements" component={GatewaySettlementsWithShell} />
      <Route path="/app/ca-review" component={CaReviewWithShell} />
      <Route path="/app/reports" component={ReportsWithShell} />
      <Route path="/app/integrations" component={IntegrationsWithShell} />
      <Route path="/app/settings" component={SettingsWithShell} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
