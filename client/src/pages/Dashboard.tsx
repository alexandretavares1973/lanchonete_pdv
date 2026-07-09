import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Edit2, Eye, EyeOff, Download, Upload } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: Date;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  // Estados para gerenciamento de clientes
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Carregar clientes do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("customers");
    if (stored) {
      setCustomers(JSON.parse(stored));
    } else {
      const defaultCustomer: Customer = {
        id: 1,
        name: "GERAL",
        phone: "",
        email: "",
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
      };
      setCustomers([defaultCustomer]);
      localStorage.setItem("customers", JSON.stringify([defaultCustomer]));
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleAddCustomer = () => {
    if (!formData.name.trim()) {
      toast.error("❌ Nome do cliente é obrigatório!");
      return;
    }

    if (editingId) {
      // Editar cliente existente
      const updated = customers.map(c =>
        c.id === editingId
          ? { ...c, name: formData.name, phone: formData.phone, email: formData.email }
          : c
      );
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      toast.success("✅ Cliente atualizado!");
    } else {
      // Adicionar novo cliente
      const newCustomer: Customer = {
        id: Date.now(),
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
      };

      const updated = [...customers, newCustomer];
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      toast.success(`✅ Cliente "${formData.name}" cadastrado com sucesso!`);
    }

    handleCloseDialog();
  };

  const handleEditCustomer = (customer: Customer) => {
    if (customer.isDefault) {
      toast.error("❌ Não é possível editar o cliente GERAL");
      return;
    }
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setShowCustomerDialog(true);
  };

  const handleToggleActive = (id: number) => {
    const customer = customers.find(c => c.id === id);
    if (customer?.isDefault) {
      toast.error("❌ Não é possível inativar o cliente GERAL");
      return;
    }

    const updated = customers.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    
    const status = updated.find(c => c.id === id)?.isActive ? "ativado" : "inativado";
    toast.success(`✅ Cliente ${status}!`);
  };

  const handleDeleteCustomer = (id: number) => {
    const customer = customers.find(c => c.id === id);
    if (customer?.isDefault) {
      toast.error("❌ Não é possível deletar o cliente GERAL");
      return;
    }
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    toast.success("✅ Cliente removido!");
  };

  const handleCloseDialog = () => {
    setShowCustomerDialog(false);
    setEditingId(null);
    setFormData({ name: "", phone: "", email: "" });
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Nome", "Telefone", "Email", "Status"],
      ...customers.map((c) => [
        c.name,
        c.phone || "",
        c.email || "",
        c.isActive ? "Ativo" : "Inativo",
      ]),
    ]
      .map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `clientes-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("✅ Clientes exportados com sucesso!");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split("\n");
        const newCustomers: Customer[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(",").map((p) => p.replace(/"/g, ""));
          if (parts.length >= 1) {
            newCustomers.push({
              id: Date.now() + i,
              name: parts[0],
              phone: parts[1] || undefined,
              email: parts[2] || undefined,
              isActive: parts[3] !== "Inativo",
              createdAt: new Date(),
            });
          }
        }

        const mergedCustomers = [...customers];
        newCustomers.forEach((newCustomer) => {
          if (!mergedCustomers.find((c) => c.name === newCustomer.name)) {
            mergedCustomers.push(newCustomer);
          }
        });

        setCustomers(mergedCustomers);
        localStorage.setItem("customers", JSON.stringify(mergedCustomers));

        toast.success(`✅ ${newCustomers.length} cliente(s) importado(s) com sucesso!`);
      } catch (error) {
        toast.error("❌ Erro ao importar arquivo CSV!");
        console.error(error);
      }
    };

    reader.readAsText(file);
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

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 border-orange-500/20 hover:border-orange-500/40" onClick={() => setShowCustomerDialog(true)}>
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

          {/* Clientes Listados */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Clientes Cadastrados</h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
                <label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      Importar CSV
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3">
              {customers.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
                </Card>
              ) : (
                customers.map((customer) => (
                  <Card key={customer.id} className={`p-4 flex items-center justify-between ${!customer.isActive ? "opacity-50" : ""}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{customer.name}</p>
                          {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                          {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                        </div>
                        {customer.isDefault && <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs font-semibold rounded">Padrão</span>}
                        {!customer.isActive && <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-600 text-xs font-semibold rounded">Inativo</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!customer.isDefault && (
                        <Button
                          onClick={() => handleEditCustomer(customer)}
                          variant="ghost"
                          size="sm"
                          disabled={!customer.isActive}
                          title={!customer.isActive ? "Cliente inativo" : "Editar"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {!customer.isDefault && (
                        <Button
                          onClick={() => handleToggleActive(customer.id)}
                          variant="ghost"
                          size="sm"
                          title={customer.isActive ? "Inativar" : "Ativar"}
                        >
                          {customer.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      )}
                      {!customer.isDefault && (
                        <Button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Cadastro/Edição de Cliente */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Nome do Cliente *
              </label>
              <Input
                placeholder="Ex: João Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Telefone
              </label>
              <Input
                placeholder="Ex: (11) 98765-4321"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Email
              </label>
              <Input
                placeholder="Ex: joao@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddCustomer}
                className="flex-1"
              >
                {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
