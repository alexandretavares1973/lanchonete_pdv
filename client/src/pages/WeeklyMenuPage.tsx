import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  items: MenuItem[];
}

export default function WeeklyMenuPage() {
  const [, setLocation] = useLocation();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<WeeklyMenu | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Gerar sábados do mês atual
  const generateSaturdaysOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const saturdays: WeeklyMenu[] = [];
    let saturdayCount = 0;

    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month, day);
      if (date.getMonth() !== month) break; // Saiu do mês
      
      if (date.getDay() === 6) { // 6 = Sábado
        saturdayCount++;
        saturdays.push({
          id: saturdayCount,
          saturdayDate: date.toISOString().split('T')[0],
          saturdayOrder: saturdayCount,
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
        });
      }
    }

    return saturdays;
  };

  useEffect(() => {
    const saturdays = generateSaturdaysOfMonth();
    setMenus(saturdays);
  }, []);

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const handleViewDetails = (menu: WeeklyMenu) => {
    setSelectedMenu(menu);
    setShowDetails(true);
  };

  const handleAddMenu = () => {
    toast.success("Novo cardápio criado!");
    setShowAddMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cardápio Semanal</h1>
            <p className="text-muted-foreground">Gerado automaticamente aos sábados</p>
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
          {menus.map((menu) => (
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
                <Button variant="outline" className="flex-1">
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {menus.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum cardápio criado para este mês</p>
            <Button
              onClick={() => setShowAddMenu(true)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Criar Primeiro Cardápio
            </Button>
          </Card>
        )}
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
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data</p>
                <p className="font-semibold text-foreground">
                  {new Date(selectedMenu.saturdayDate).toLocaleDateString("pt-BR")}
                </p>
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
                <Button className="flex-1 bg-gradient-to-r from-primary to-secondary">
                  Editar Cardápio
                </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Cardápio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Selecione o Sábado
              </label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground">
                {menus.map((menu) => (
                  <option key={menu.id} value={menu.id}>
                    {getSaturdayLabel(menu.saturdayOrder)} - {new Date(menu.saturdayDate).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Produtos
              </label>
              <p className="text-sm text-muted-foreground">
                Selecione os produtos que estarão disponíveis neste sábado
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddMenu}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
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
