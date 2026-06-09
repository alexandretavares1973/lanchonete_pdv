import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/60">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">POS</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Lanchonete PDV</h1>
            <p className="text-sm text-muted-foreground">Sistema de Ponto de Venda</p>
          </div>

          <div className="space-y-4 text-center">
            <p className="text-foreground/70 text-sm leading-relaxed">
              Bem-vindo ao sistema de gerenciamento de caixa e vendas para sua lanchonete.
            </p>
            <p className="text-foreground/60 text-xs">
              Faca login com sua conta para acessar o sistema.
            </p>
          </div>

          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          >
            Fazer Login
          </Button>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Desenvolvido com amor para sua lanchonete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
