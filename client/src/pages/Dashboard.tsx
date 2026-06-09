import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-50">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">POS</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Lanchonete PDV</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Placeholder Cards */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                <p className="text-3xl font-bold text-foreground">R$ 0,00</p>
                <p className="text-xs text-muted-foreground">Atualizando...</p>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Pedidos</p>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Nenhum pedido</p>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Caixa</p>
                <p className="text-3xl font-bold text-foreground">Fechado</p>
                <p className="text-xs text-muted-foreground">Abrir caixa</p>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Cadastrados</p>
              </div>
            </Card>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-primary/20 hover:border-primary/40" onClick={() => setLocation("/pos")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">🛒</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Novo Pedido</h3>
                  <p className="text-sm text-muted-foreground">Iniciar venda</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-primary/20 hover:border-primary/40" onClick={() => setLocation("/products")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">📦</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cardapio</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar produtos</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-primary/20 hover:border-primary/40" onClick={() => setLocation("/reports")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Relatorios</h3>
                  <p className="text-sm text-muted-foreground">Ver vendas</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
