import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, Edit2, Eye, EyeOff } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: Date;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDialog, setShowDialog] = useState(false);
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
      // Criar cliente "GERAL" padrão
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

  const handleAddCustomer = () => {
    if (!formData.name.trim()) {
      toast.error("Nome do cliente é obrigatório");
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
      toast.success("Cliente atualizado!");
    } else {
      // Adicionar novo cliente
      const newCustomer: Customer = {
        id: Date.now(),
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
      };
      const updated = [...customers, newCustomer];
      setCustomers(updated);
      localStorage.setItem("customers", JSON.stringify(updated));
      toast.success("Cliente adicionado!");
    }

    setFormData({ name: "", phone: "", email: "" });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleEditCustomer = (customer: Customer) => {
    if (customer.isDefault) {
      toast.error("Não é possível editar o cliente GERAL");
      return;
    }
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setShowDialog(true);
  };

  const handleToggleActive = (id: number) => {
    const customer = customers.find(c => c.id === id);
    if (customer?.isDefault) {
      toast.error("Não é possível inativar o cliente GERAL");
      return;
    }
    const updated = customers.map(c =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    toast.success(customer?.isActive ? "Cliente inativado!" : "Cliente ativado!");
  };

  const handleDeleteCustomer = (id: number) => {
    const customer = customers.find(c => c.id === id);
    if (customer?.isDefault) {
      toast.error("Não é possível deletar o cliente GERAL");
      return;
    }
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    localStorage.setItem("customers", JSON.stringify(updated));
    toast.success("Cliente removido!");
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({ name: "", phone: "", email: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Gerenciar Clientes</h1>
          <p className="text-muted-foreground">Cadastre, edite, inative ou remova clientes da sua lanchonete</p>
        </div>

        {/* Botão Adicionar */}
        <Button
          onClick={() => setShowDialog(true)}
          className="mb-6 bg-gradient-to-r from-primary to-secondary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Cliente
        </Button>

        {/* Lista de Clientes */}
        <div className="grid gap-4">
          {customers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
            </Card>
          ) : (
            customers.map(customer => (
              <Card 
                key={customer.id} 
                className={`p-4 hover:shadow-lg transition-all ${!customer.isActive ? 'opacity-60 bg-muted/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-lg ${customer.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                        {customer.name}
                      </h3>
                      {customer.isDefault && (
                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                          Padrão
                        </span>
                      )}
                      {!customer.isActive && (
                        <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs font-medium rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground">📱 {customer.phone}</p>
                    )}
                    {customer.email && (
                      <p className="text-sm text-muted-foreground">📧 {customer.email}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!customer.isDefault && (
                      <>
                        <Button
                          onClick={() => handleEditCustomer(customer)}
                          variant="outline"
                          size="sm"
                          title={customer.isActive ? "Editar cliente" : "Não é possível editar cliente inativo"}
                          disabled={!customer.isActive}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleToggleActive(customer.id)}
                          variant={customer.isActive ? "outline" : "default"}
                          size="sm"
                          title={customer.isActive ? "Inativar cliente" : "Ativar cliente"}
                        >
                          {customer.isActive ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          variant="destructive"
                          size="sm"
                          title="Deletar cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Dialog Adicionar/Editar */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Cliente" : "Adicionar Cliente"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Nome do Cliente *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Telefone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Email
                </label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: joao@email.com"
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCloseDialog}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddCustomer}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  {editingId ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
