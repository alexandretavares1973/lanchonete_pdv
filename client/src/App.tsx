import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LocalAuthProvider, useLocalAuth } from "./contexts/LocalAuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POSPage from "./pages/POSPage";

import ReportsPage from "./pages/ReportsPage";
import LocalLogin from "./pages/LocalLogin";
import WeeklyMenuPage from "./pages/WeeklyMenuPage";
import CashierResponsiblePage from "./pages/CashierResponsiblePage";

import CustomerReportPage from "./pages/CustomerReportPage";
import { useAuth } from "@/_core/hooks/useAuth";

function Router() {
  const { isAuthenticated: localAuth, loading: localLoading } = useLocalAuth();
  const { isAuthenticated, loading } = useAuth();

  // Usar autenticação local se disponível, caso contrário usar autenticação do servidor
  const isUserAuthenticated = localAuth || isAuthenticated;
  const isLoading = localLoading || loading;

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
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/local-login"} component={LocalLogin} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/pos"} component={POSPage} />

      <Route path={"/customer-report"} component={CustomerReportPage} />
      <Route path={"/reports"} component={ReportsPage} />
      <Route path={"/weekly-menu"} component={WeeklyMenuPage} />
      <Route path={"/cashier-responsible"} component={CashierResponsiblePage} />
      <Route path={""} component={isUserAuthenticated ? Dashboard : Login} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
