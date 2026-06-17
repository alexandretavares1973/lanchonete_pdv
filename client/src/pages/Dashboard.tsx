import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: Date;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) {
      toast.error("❌ Nome do cliente é obrigatório!");
      return;
    }

    const customers = JSON.parse(localStorage.getItem("customers") || "[]");
    const newCustomer: Customer = {
      id: Math.max(...customers.map((c: Customer) => c.id), 0) + 1,
      name: newCustomerName,
      phone: newCustomerPhone || undefined,
      email: newCustomerEmail || undefined,
      isActive: true,
      createdAt: new Date(),
    };

    customers.push(newCustomer);
    localStorage.setItem("customers", JSON.stringify(customers));
    
    toast.success(`✅ Cliente "${newCustomerName}" cadastrado com sucesso!`);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setShowAddCustomer(false);
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

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-purple-500/20 hover:border-purple-500/40" onClick={() => setLocation("/weekly-menu")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">📅</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cardápio Semanal</h3>
                  <p className="text-sm text-muted-foreground">Sábados e produtos</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-green-500/20 hover:border-green-500/40" onClick={() => setLocation("/cashier-responsible")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">👤</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Responsáveis</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar operadores</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-blue-500/20 hover:border-blue-500/40" onClick={() => setLocation("/customers")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">👥</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Gerenciar Clientes</h3>
                  <p className="text-sm text-muted-foreground">Editar e inativar</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-indigo-500/20 hover:border-indigo-500/40" onClick={() => setLocation("/customer-report")}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Relatório Clientes</h3>
                  <p className="text-sm text-muted-foreground">Análise e exportação</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-orange-500/20 hover:border-orange-500/40" onClick={() => setShowAddCustomer(true)}>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <span className="text-3xl">➕</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cadastrar Cliente</h3>
                  <p className="text-sm text-muted-foreground">Novo cliente</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Cadastro de Cliente */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Nome do Cliente *
              </label>
              <Input
                placeholder="Ex: João Silva"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Telefone
              </label>
              <Input
                placeholder="Ex: (11) 98765-4321"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Email
              </label>
              <Input
                placeholder="Ex: joao@email.com"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddCustomer(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddCustomer}
                className="flex-1"
              >
                Cadastrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
