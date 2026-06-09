import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import POSPage from "./pages/POSPage";

import ReportsPage from "./pages/ReportsPage";
import LocalLogin from "./pages/LocalLogin";
import WeeklyMenuPage from "./pages/WeeklyMenuPage";
import CashierResponsiblePage from "./pages/CashierResponsiblePage";
import { useAuth } from "@/_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
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
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/pos"} component={POSPage} />

      <Route path={"/reports"} component={ReportsPage} />
      <Route path={"/weekly-menu"} component={WeeklyMenuPage} />
      <Route path={"/cashier-responsible"} component={CashierResponsiblePage} />
      <Route path={""} component={isAuthenticated ? Dashboard : Login} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
