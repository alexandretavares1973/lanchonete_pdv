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
}

interface MenuItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  availableQuantity: number | null;
  isAvailable: boolean;
}

interface WeeklyMenu {
  id: number;
  saturdayDate: string;
  saturdayOrder: number;
  responsibleId: number | null;
  responsibleName?: string;
  items: MenuItem[];
}

export default function WeeklyMenuPage() {
  const [, setLocation] = useLocation();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<WeeklyMenu | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [formData, setFormData] = useState({
    saturdayDate: "",
    saturdayOrder: 1,
    responsibleId: "",
  });

  // Carregar responsáveis do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cashierResponsibles");
    if (stored) {
      setResponsibles(JSON.parse(stored));
    }

    // Carregar cardápios do localStorage
    const storedMenus = localStorage.getItem("weeklyMenus");
    if (storedMenus) {
      setMenus(JSON.parse(storedMenus));
    }
  }, []);

  const handleAddMenu = () => {
    if (!formData.saturdayDate || !formData.responsibleId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const responsible = responsibles.find(r => r.id === parseInt(formData.responsibleId));
    if (!responsible) {
      toast.error("Responsável não encontrado");
      return;
    }

    const newMenu: WeeklyMenu = {
      id: Date.now(),
      saturdayDate: formData.saturdayDate,
      saturdayOrder: formData.saturdayOrder,
      responsibleId: parseInt(formData.responsibleId),
      responsibleName: responsible.name,
      items: [
        {
          id: 1,
          productId: 1,
          productName: "Hambúrguer Clássico",
          price: 25.00,
          availableQuantity: 50,
          isAvailable: true,
        },
        {
          id: 2,
          productId: 2,
          productName: "Pizza Margherita",
          price: 35.00,
          availableQuantity: 30,
          isAvailable: true,
        },
        {
          id: 3,
          productId: 3,
          productName: "Refrigerante 2L",
          price: 8.50,
          availableQuantity: null,
          isAvailable: true,
        },
      ],
    };

    const updated = [...menus, newMenu];
    setMenus(updated);
    localStorage.setItem("weeklyMenus", JSON.stringify(updated));
    
    toast.success("Cardápio criado com sucesso!");
    setFormData({ saturdayDate: "", saturdayOrder: 1, responsibleId: "" });
    setShowAddMenu(false);
  };

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const handleViewDetails = (menu: WeeklyMenu) => {
    setSelectedMenu(menu);
    setShowDetails(true);
  };

  const handleDeleteMenu = (id: number) => {
    const updated = menus.filter(m => m.id !== id);
    setMenus(updated);
    localStorage.setItem("weeklyMenus", JSON.stringify(updated));
    toast.success("Cardápio removido!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cardápio Semanal</h1>
            <p className="text-muted-foreground">Gerencie cardápios dos sábados com responsáveis</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddMenu(true)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Novo Cardápio
            </Button>
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Menus Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.length === 0 ? (
            <Card className="col-span-full p-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhum cardápio criado</p>
              <Button
                onClick={() => setShowAddMenu(true)}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                Criar Primeiro Cardápio
              </Button>
            </Card>
          ) : (
            menus.map((menu) => (
              <Card key={menu.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {getSaturdayLabel(menu.saturdayOrder)}
                    </h2>
                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {menu.items.length} itens
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(menu.saturdayDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Responsável */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-muted-foreground mb-1">Responsável</p>
                  <p className="font-semibold text-foreground text-sm">
                    {menu.responsibleName || "Não atribuído"}
                  </p>
                </div>

                {/* Items Preview */}
                <div className="space-y-2 mb-4">
                  {menu.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate">{item.productName}</span>
                      <span className="text-primary font-semibold">R$ {item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  {menu.items.length > 3 && (
                    <p className="text-xs text-muted-foreground pt-2">
                      +{menu.items.length - 3} produtos...
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 rounded">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-700">Cardápio Ativo</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleViewDetails(menu)}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    onClick={() => handleDeleteMenu(menu.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    Deletar
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Menu Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMenu && getSaturdayLabel(selectedMenu.saturdayOrder)}
            </DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Data</p>
                  <p className="font-semibold text-foreground">
                    {new Date(selectedMenu.saturdayDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Responsável</p>
                  <p className="font-semibold text-foreground">
                    {selectedMenu.responsibleName || "Não atribuído"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Produtos Disponíveis</h3>
                <div className="space-y-2">
                  {selectedMenu.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.availableQuantity
                            ? `${item.availableQuantity} disponível`
                            : "Quantidade ilimitada"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.isAvailable
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {item.isAvailable ? "Disponível" : "Indisponível"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setShowDetails(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Menu Dialog */}
      <Dialog open={showAddMenu} onOpenChange={setShowAddMenu}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Cardápio de Sábado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Data do Sábado *
              </label>
              <Input
                type="date"
                value={formData.saturdayDate}
                onChange={(e) => setFormData({ ...formData, saturdayDate: e.target.value })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Selecione o sábado para este cardápio
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Ordem do Sábado *
              </label>
              <select
                value={formData.saturdayOrder}
                onChange={(e) => setFormData({ ...formData, saturdayOrder: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value={1}>1º Sábado</option>
                <option value={2}>2º Sábado</option>
                <option value={3}>3º Sábado</option>
                <option value={4}>4º Sábado</option>
                <option value={5}>5º Sábado</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Responsável pelo Cardápio *
              </label>
              {responsibles.length === 0 ? (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Nenhum responsável cadastrado. <br />
                    <Button
                      onClick={() => setLocation("/cashier-responsible")}
                      variant="link"
                      className="p-0 h-auto text-yellow-800 underline"
                    >
                      Cadastre um responsável primeiro
                    </Button>
                  </p>
                </div>
              ) : (
                <select
                  value={formData.responsibleId}
                  onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">Selecione um responsável</option>
                  {responsibles.map((resp) => (
                    <option key={resp.id} value={resp.id}>
                      {resp.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddMenu}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
                disabled={responsibles.length === 0}
              >
                Criar Cardápio
              </Button>
              <Button
                onClick={() => setShowAddMenu(false)}
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
  );
}
