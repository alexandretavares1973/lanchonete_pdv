import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Responsible {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  createdAt: string;
}

export default function CashierResponsiblePage() {
  const [, setLocation] = useLocation();
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", cpf: "", phone: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Carregar responsáveis do localStorage (simulação)
  useEffect(() => {
    const stored = localStorage.getItem("cashierResponsibles");
    if (stored) {
      setResponsibles(JSON.parse(stored));
    }
  }, []);

  const handleAddResponsible = () => {
    if (!formData.name || !formData.cpf) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const newResponsible: Responsible = {
      id: editingId || Date.now(),
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      createdAt: new Date().toISOString(),
    };

    let updated: Responsible[];
    if (editingId) {
      updated = responsibles.map(r => r.id === editingId ? newResponsible : r);
      toast.success("Responsável atualizado!");
    } else {
      updated = [...responsibles, newResponsible];
      toast.success("Responsável cadastrado!");
    }

    setResponsibles(updated);
    localStorage.setItem("cashierResponsibles", JSON.stringify(updated));
    setFormData({ name: "", cpf: "", phone: "" });
    setEditingId(null);
    setShowDialog(false);
  };

  const handleEditResponsible = (responsible: Responsible) => {
    setFormData({
      name: responsible.name,
      cpf: responsible.cpf,
      phone: responsible.phone,
    });
    setEditingId(responsible.id);
    setShowDialog(true);
  };

  const handleDeleteResponsible = (id: number) => {
    const updated = responsibles.filter(r => r.id !== id);
    setResponsibles(updated);
    localStorage.setItem("cashierResponsibles", JSON.stringify(updated));
    toast.success("Responsável removido!");
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Responsáveis pelo Caixa</h1>
            <p className="text-muted-foreground">Gerencie os operadores do caixa</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setFormData({ name: "", cpf: "", phone: "" });
                setEditingId(null);
                setShowDialog(true);
              }}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Adicionar Responsável
            </Button>
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Responsibles Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">CPF</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Telefone</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Data de Cadastro</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {responsibles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                      Nenhum responsável cadastrado
                    </td>
                  </tr>
                ) : (
                  responsibles.map((responsible) => (
                    <tr key={responsible.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground">{responsible.name}</p>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatCPF(responsible.cpf.replace(/\D/g, "").padStart(11, "0"))}
                      </td>
                      <td className="py-3 px-4 text-foreground">{responsible.phone || "-"}</td>
                      <td className="py-3 px-4 text-foreground">
                        {new Date(responsible.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditResponsible(responsible)}
                            variant="outline"
                            size="sm"
                          >
                            Editar
                          </Button>
                          <Button
                            onClick={() => handleDeleteResponsible(responsible.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Deletar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add/Edit Responsible Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Responsável" : "Adicionar Novo Responsável"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Nome Completo *
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
                  CPF *
                </label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setFormData({ ...formData, cpf: value });
                  }}
                  placeholder="00000000000"
                  maxLength={11}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas números (11 dígitos)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Telefone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setFormData({ ...formData, phone: value });
                  }}
                  placeholder="00000000000"
                  maxLength={11}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas números (com DDD)
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAddResponsible}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  {editingId ? "Atualizar" : "Adicionar"}
                </Button>
                <Button
                  onClick={() => setShowDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
