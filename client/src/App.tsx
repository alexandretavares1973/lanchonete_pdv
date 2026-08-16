import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocalAuthProvider, useLocalAuth } from "./contexts/LocalAuthContext";
import Home from "./pages/Home";
import Login from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";
import POSPage from "./pages/POSPage";

import ReportsPage from "./pages/ReportsPage";
import LocalLogin from "./pages/LocalLogin";
import WeeklyMenuPage from "./pages/WeeklyMenuPage";
import CashierResponsiblePage from "./pages/CashierResponsiblePage";
import SettingsPage from "./pages/SettingsPage";
import ProductsPage from "./pages/ProductsPage";

import CustomerReportPage from "./pages/CustomerReportPage";
import CustomerBehaviorAnalysisPage from "./pages/CustomerBehaviorAnalysisPage";
import HistoricalSessionReviewPage from "./pages/HistoricalSessionReviewPage";
import ConcurrencySimulatorPage from "./pages/ConcurrencySimulatorPage";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRealtimeSync, type RealtimeConnectionStatus } from "./hooks/useRealtimeSync";
import { LoaderCircle, Wifi, WifiOff } from "lucide-react";

function Router() {
  const { isAuthenticated: localAuth, loading: localLoading } = useLocalAuth();
  const { isAuthenticated, loading } = useAuth();

  // Usar autenticação local se disponível, caso contrário usar autenticação do servidor
  const isUserAuthenticated = localAuth || isAuthenticated;
  const isLoading = localLoading || loading;
  const realtimeStatus = useRealtimeSync({ enabled: isUserAuthenticated });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/60">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RealtimeStatusIndicator status={realtimeStatus} />
      <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={RegisterPage} />
      <Route path={"/forgot-password"} component={ForgotPasswordPage} />
      <Route path={"/profile"} component={ProfilePage} />
      <Route path={"/local-login"} component={LocalLogin} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/pos"} component={POSPage} />

      <Route path={"/customer-report"} component={CustomerReportPage} />
      <Route path={"/customer-behavior-analysis"} component={CustomerBehaviorAnalysisPage} />
      <Route path={"/historical-sessions"} component={HistoricalSessionReviewPage} />
      <Route path={"/concurrency-simulator"} component={ConcurrencySimulatorPage} />
      <Route path={"/reports"} component={ReportsPage} />
      <Route path={"/weekly-menu"} component={WeeklyMenuPage} />
      <Route path={"/cashier-responsible"} component={CashierResponsiblePage} />
      <Route path={"/settings"} component={SettingsPage} />
      <Route path={"/products"} component={ProductsPage} />
      <Route path={""} component={isUserAuthenticated ? Dashboard : Login} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

function RealtimeStatusIndicator({ status }: { status: RealtimeConnectionStatus }) {
  if (status === "disabled") return null;

  const copy = {
    connecting: "Conectando ao tempo real",
    connected: "Tempo real conectado · melhor esforço",
    disconnected: "Tempo real indisponível · reconectando",
  }[status];
  const Icon = status === "connected" ? Wifi : status === "connecting" ? LoaderCircle : WifiOff;
  const color = status === "connected" ? "text-emerald-700" : status === "connecting" ? "text-amber-700" : "text-destructive";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur" role="status" aria-live="polite">
      <Icon className={`h-3.5 w-3.5 ${color} ${status === "connecting" ? "animate-spin" : ""}`} />
      <span className="text-muted-foreground">{copy}</span>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LocalAuthProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </LocalAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
