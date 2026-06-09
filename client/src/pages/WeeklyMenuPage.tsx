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
  id: string;
  productName: string;
  price: number;
  quantity: number | null;
  isUnlimited: boolean;
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
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    saturdayDate: "",
    saturdayOrder: 1,
    responsibleId: "",
  });

  const [productForm, setProductForm] = useState({
    productName: "",
    price: "",
    quantity: "",
    isUnlimited: false,
  });

  // Carregar responsáveis do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("cashierResponsibles");
    if (stored) {
      setResponsibles(JSON.parse(stored));
    }

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
      items: [],
    };

    const updated = [...menus, newMenu];
    setMenus(updated);
    localStorage.setItem("weeklyMenus", JSON.stringify(updated));
    
    toast.success("Cardápio criado! Agora adicione os produtos.");
    setEditingMenuId(newMenu.id);
    setShowAddProducts(true);
    setFormData({ saturdayDate: "", saturdayOrder: 1, responsibleId: "" });
    setShowAddMenu(false);
  };

  const handleAddProduct = () => {
    if (!productForm.productName || !productForm.price) {
      toast.error("Preencha nome e preço do produto");
      return;
    }

    if (!editingMenuId) {
      toast.error("Nenhum cardápio selecionado");
      return;
    }

    const price = parseFloat(productForm.price);
    const quantity = productForm.isUnlimited ? null : (productForm.quantity ? parseInt(productForm.quantity) : 0);

    const newProduct: MenuItem = {
      id: `${Date.now()}-${Math.random()}`,
      productName: productForm.productName,
      price,
      quantity,
      isUnlimited: productForm.isUnlimited,
    };

    const updated = menus.map(menu => {
      if (menu.id === editingMenuId) {
        return { ...menu, items: [...menu.items, newProduct] };
      }
      return menu;
    });

    setMenus(updated);
    localStorage.setItem("weeklyMenus", JSON.stringify(updated));
    
    toast.success("Produto adicionado!");
    setProductForm({ productName: "", price: "", quantity: "", isUnlimited: false });
  };

  const handleRemoveProduct = (menuId: number, productId: string) => {
    const updated = menus.map(menu => {
      if (menu.id === menuId) {
        return { ...menu, items: menu.items.filter(item => item.id !== productId) };
      }
      return menu;
    });

    setMenus(updated);
    localStorage.setItem("weeklyMenus", JSON.stringify(updated));
    toast.success("Produto removido!");
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

  const handleEditProducts = (menu: WeeklyMenu) => {
    setEditingMenuId(menu.id);
    setSelectedMenu(menu);
    setShowDetails(false);
    setShowAddProducts(true);
  };

  const currentEditingMenu = menus.find(m => m.id === editingMenuId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cardápio Semanal</h1>
            <p className="text-muted-foreground">Crie cardápios com produtos específicos para cada sábado</p>
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
                  {menu.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum produto adicionado</p>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 mb-4 p-2 bg-green-50 rounded">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-700">Cardápio Ativo</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-col">
                  <Button
                    onClick={() => handleViewDetails(menu)}
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                  >
                    Ver Detalhes
                  </Button>
                  <Button
                    onClick={() => handleEditProducts(menu)}
                    variant="outline"
                    className="w-full"
                  >
                    Editar Produtos
                  </Button>
                  <Button
                    onClick={() => handleDeleteMenu(menu.id)}
                    variant="destructive"
                    className="w-full"
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
                <h3 className="font-semibold text-foreground mb-3">Produtos do Cardápio</h3>
                {selectedMenu.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto adicionado</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMenu.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.isUnlimited
                              ? "Quantidade ilimitada"
                              : `${item.quantity} disponível`}
                          </p>
                        </div>
                        <p className="font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleEditProducts(selectedMenu)}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  Editar Produtos
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

      {/* Add Products Dialog */}
      <Dialog open={showAddProducts} onOpenChange={setShowAddProducts}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Adicionar Produtos - {currentEditingMenu && getSaturdayLabel(currentEditingMenu.saturdayOrder)}
            </DialogTitle>
          </DialogHeader>
          {currentEditingMenu && (
            <div className="space-y-4">
              {/* Produtos Existentes */}
              {currentEditingMenu.items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Produtos Adicionados</h3>
                  <div className="space-y-2 mb-4">
                    {currentEditingMenu.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {item.price.toFixed(2)} • {item.isUnlimited ? "Ilimitado" : `${item.quantity} un`}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemoveProduct(currentEditingMenu.id, item.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulário para Adicionar Novo Produto */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-3">Adicionar Novo Produto</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Nome do Produto *
                    </label>
                    <Input
                      value={productForm.productName}
                      onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
                      placeholder="Ex: Hambúrguer Clássico"
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        Preço (R$) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        Quantidade
                      </label>
                      <Input
                        type="number"
                        value={productForm.quantity}
                        onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                        placeholder="0"
                        disabled={productForm.isUnlimited}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="unlimited"
                      checked={productForm.isUnlimited}
                      onChange={(e) => setProductForm({ ...productForm, isUnlimited: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="unlimited" className="text-sm text-foreground">
                      Quantidade ilimitada
                    </label>
                  </div>

                  <Button
                    onClick={handleAddProduct}
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                  >
                    Adicionar Produto
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  onClick={() => {
                    setShowAddProducts(false);
                    setEditingMenuId(null);
                    setProductForm({ productName: "", price: "", quantity: "", isUnlimited: false });
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
