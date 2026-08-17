import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Responsible {
  id: number;
  name: string;
  cpf: string;
  phone: string;
}

interface MenuItem {
  id: number | string;
  productName: string;
  price: number;
  quantity: number | null;
}

interface WeeklyMenu {
  id: number;
  saturdayDate: Date | string;
  saturdayOrder: number;
  responsibleId: number | null;
  responsibleName?: string;
  status: "open" | "closed";
  items: MenuItem[];
}

export default function WeeklyMenuPage() {
  const [, setLocation] = useLocation();
  const { data: menus = [], isLoading: menusLoading } = trpc.pdv.menu.list.useQuery();
  const { data: responsibles = [] } = trpc.pdv.cashierResponsibles.list.useQuery();
  const { data: globalProducts = [] } = trpc.pdv.products.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [openMenuBlockedMessage, setOpenMenuBlockedMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    saturdayDate: "",
    saturdayOrder: 1,
    responsibleId: "",
  });

  const [productForm, setProductForm] = useState({
    productName: "",
    price: "",
    quantity: "",
  });

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductForm, setEditingProductForm] = useState({
    quantity: "",
  });

  const createMenuMutation = trpc.pdv.menu.create.useMutation({
    onSuccess: async (menu) => {
      await utils.pdv.menu.list.invalidate();
      toast.success("Cardápio criado! Agora adicione os produtos.");
      if (menu?.id) {
        setEditingMenuId(menu.id);
        setShowAddProducts(true);
      }
      setFormData({ saturdayDate: "", saturdayOrder: 1, responsibleId: "" });
      setShowAddMenu(false);
    },
    onError: (error) => toast.error(error.message || "Não foi possível criar o cardápio."),
  });
  const addMenuItemMutation = trpc.pdv.menu.addItem.useMutation({
    onSuccess: async () => {
      await utils.pdv.menu.list.invalidate();
      toast.success("Produto adicionado ao cardápio!");
      setProductForm({ productName: "", price: "", quantity: "" });
    },
    onError: (error) => toast.error(error.message || "Não foi possível adicionar o produto."),
  });
  const updateMenuMutation = trpc.pdv.menu.update.useMutation({
    onSuccess: async () => {
      await utils.pdv.menu.list.invalidate();
      toast.success("Status do cardápio atualizado!");
    },
    onError: (error) => {
      const msg = error.message || "Não foi possível atualizar o cardápio.";
      if (msg.includes("Primeiro feche o cardápio que já está aberto")) {
        setOpenMenuBlockedMessage(msg);
      } else {
        toast.error(msg);
      }
    },
  });
  const deleteMenuMutation = trpc.pdv.menu.delete.useMutation({
    onSuccess: async () => {
      await utils.pdv.menu.list.invalidate();
      setSelectedMenu(null);
      toast.success("Cardápio removido!");
    },
    onError: (error) => toast.error(error.message || "Não foi possível remover o cardápio."),
  });
  const updateMenuItemMutation = trpc.pdv.menu.updateItem.useMutation({
    onSuccess: async () => {
      await utils.pdv.menu.list.invalidate();
      setEditingProductId(null);
      toast.success("Quantidade atualizada!");
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a quantidade."),
  });
  const deleteMenuItemMutation = trpc.pdv.menu.deleteItem.useMutation({
    onSuccess: async () => {
      await utils.pdv.menu.list.invalidate();
      toast.success("Produto removido!");
    },
    onError: (error) => toast.error(error.message || "Não foi possível remover o produto."),
  });

  const handleAddMenu = () => {
    if (!formData.saturdayDate || !formData.responsibleId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const responsibleId = Number(formData.responsibleId);
    if (!Number.isInteger(responsibleId)) {
      toast.error("Responsável não encontrado");
      return;
    }

    createMenuMutation.mutate({
      saturdayDate: formData.saturdayDate,
      saturdayOrder: formData.saturdayOrder,
      responsibleId,
      status: "closed",
    });
  };

  const handleAddProduct = () => {
    if (!productForm.productName || !productForm.quantity) {
      toast.error("Selecione um produto cadastrado e informe a quantidade.");
      return;
    }
    if (!editingMenuId) {
      toast.error("Nenhum cardápio selecionado");
      return;
    }
    const product = globalProducts.find((candidate) => candidate.name.trim().toLocaleLowerCase() === productForm.productName.trim().toLocaleLowerCase());
    if (!product) {
      toast.error("Produto não encontrado no cadastro global. Cadastre-o em Produtos antes de adicioná-lo ao cardápio.");
      return;
    }
    const quantity = Number(productForm.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error("Informe uma quantidade inteira não negativa.");
      return;
    }
    addMenuItemMutation.mutate({ menuId: editingMenuId, productId: product.id, availableQuantity: quantity });
  };

  const handleEditProductQuantity = (item: any) => {
    setEditingProductId(item.id);
    setEditingProductForm({ quantity: item.quantity?.toString() || "" });
  };

  const handleSaveProductQuantity = (_menuId: number, productId: string) => {
    if (!editingProductForm.quantity) {
      toast.error("Informe a quantidade");
      return;
    }

    const newQuantity = parseInt(editingProductForm.quantity);
    if (newQuantity < 0) {
      toast.error("Quantidade não pode ser negativa");
      return;
    }

    const menuItemId = Number(productId);
    if (!Number.isInteger(menuItemId)) {
      toast.error("Identificador do item de cardápio inválido.");
      return;
    }
    updateMenuItemMutation.mutate({ menuItemId, availableQuantity: newQuantity });
  };

  const handleRemoveProduct = (_menuId: number, productId: string) => {
    const menuItemId = Number(productId);
    if (!Number.isInteger(menuItemId)) {
      toast.error("Identificador do item de cardápio inválido.");
      return;
    }
    if (window.confirm("Deseja remover este produto do cardápio?")) {
      deleteMenuItemMutation.mutate({ menuItemId });
    }
  };

  const handleToggleStatus = (menuId: number) => {
    const menu = menus.find((candidate: any) => candidate.id === menuId);
    if (!menu) return;

    const targetStatus = menu.status === "open" ? "closed" : "open";
    if (targetStatus === "open") {
      const alreadyOpen = menus.find((m: any) => m.status === "open" && m.id !== menuId);
      if (alreadyOpen) {
        const saturdayLabel = `${["1º", "2º", "3º", "4º", "5º"][alreadyOpen.saturdayOrder - 1] || alreadyOpen.saturdayOrder}º Sábado`;
        const dateStr = new Date(alreadyOpen.saturdayDate).toLocaleDateString("pt-BR");
        setOpenMenuBlockedMessage(`Não é possível abrir este cardápio. Primeiro feche o cardápio que já está aberto: ${saturdayLabel} (${dateStr}).`);
        return;
      }
    }

    updateMenuMutation.mutate({ id: menuId, status: targetStatus });
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
    if (window.confirm("Deseja realmente deletar este cardápio e seus itens?")) {
      deleteMenuMutation.mutate({ id });
    }
  };

  const handleEditProducts = (menu: any) => {
    setEditingMenuId(menu.id);
    setSelectedMenu(menu);
    setShowDetails(false);
    setShowAddProducts(true);
  };

  const currentEditingMenu = menus.find((m: any) => m.id === editingMenuId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Dialogo de bloqueio de cardápio duplo aberto */}
        <Dialog open={Boolean(openMenuBlockedMessage)} onOpenChange={(open) => !open && setOpenMenuBlockedMessage(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">⚠️ Ação não permitida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm leading-relaxed text-foreground font-medium">
                {openMenuBlockedMessage}
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={() => setOpenMenuBlockedMessage(null)} className="bg-primary text-primary-foreground">
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
              <Card key={menu.id} className={`p-6 hover:shadow-lg transition-shadow border-2 ${
                menu.status === "open" ? "border-green-500" : "border-red-500"
              }`}>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-foreground">
                      {getSaturdayLabel(menu.saturdayOrder)}
                    </h2>
                    <div className="flex gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        menu.status === "open"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {menu.status === "open" ? "🟢 Aberto" : "🔴 Fechado"}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                        {menu.items.length} itens
                      </span>
                    </div>
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
                      {menu.items.slice(0, 3).map((item: any) => (
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
                  {(() => {
                    const hasAnotherOpen = menu.status !== "open" && menus.some((m: any) => m.status === "open" && m.id !== menu.id);
                    return (
                      <Button
                        onClick={() => handleToggleStatus(menu.id)}
                        disabled={hasAnotherOpen}
                        title={hasAnotherOpen ? "Já existe outro cardápio aberto no momento." : undefined}
                        className={`w-full gap-2 ${
                          menu.status === "open"
                            ? "bg-red-500 hover:bg-red-600"
                            : hasAnotherOpen
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        {menu.status === "open" ? (
                          <>
                            <Lock className="w-4 h-4" />
                            Fechar Cardápio
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            Abrir Cardápio
                          </>
                        )}
                      </Button>
                    );
                  })()}
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
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <p className={`font-semibold ${
                    selectedMenu.status === "open" ? "text-green-600" : "text-red-600"
                  }`}>
                    {selectedMenu.status === "open" ? "🟢 Aberto" : "🔴 Fechado"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Responsável</p>
                  <p className="font-semibold text-foreground">
                    {selectedMenu.responsibleName || "Não atribuído"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total de Produtos</p>
                  <p className="font-semibold text-foreground">
                    {selectedMenu.items.length}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Produtos do Cardápio</h3>
                {selectedMenu.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto adicionado</p>
                ) : (
                  <div className="space-y-2">
                      {selectedMenu.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {`${item.quantity ?? 0} disponível`}
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
                    {currentEditingMenu.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {item.price.toFixed(2)} • {item.quantity ?? 0} un
                          </p>
                        </div>
                        {editingProductId === item.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min="0"
                              value={editingProductForm.quantity}
                              onChange={(e) => setEditingProductForm({ quantity: e.target.value })}
                              className="w-20 h-8"
                            />
                            <Button
                              onClick={() => handleSaveProductQuantity(currentEditingMenu.id, item.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              OK
                            </Button>
                            <Button
                              onClick={() => setEditingProductId(null)}
                              size="sm"
                              variant="outline"
                            >
                              X
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditProductQuantity(item)}
                              variant="outline"
                              size="sm"
                            >
                              Editar Qtd
                            </Button>
                            <Button
                              onClick={() => handleRemoveProduct(currentEditingMenu.id, item.id)}
                              variant="destructive"
                              size="sm"
                            >
                              Remover
                            </Button>
                          </div>
                        )}
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
                      Produto cadastrado *
                    </label>
                    <select
                      value={productForm.productName}
                      onChange={(e) => {
                        const selected = globalProducts.find((product) => product.name === e.target.value);
                        setProductForm({ ...productForm, productName: e.target.value, price: selected ? String(selected.price) : "" });
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Selecione um produto global</option>
                      {globalProducts.map((product) => (
                        <option key={product.id} value={product.name}>
                          {product.name} — R$ {Number(product.price).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        Quantidade
                      </label>
                      <Input
                        type="number"
                        value={productForm.quantity}
                        onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                        placeholder="0"
                        className="w-full"
                      />
                    </div>
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
                    setProductForm({ productName: "", price: "", quantity: "" });
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
