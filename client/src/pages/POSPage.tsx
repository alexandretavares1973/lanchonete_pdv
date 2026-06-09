import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart, Trash2, Lock } from "lucide-react";

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
  status: "open" | "closed";
  items: MenuItem[];
}

interface CartItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export default function POSPage() {
  const [, setLocation] = useLocation();
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    const storedMenus = localStorage.getItem("weeklyMenus");
    if (storedMenus) {
      const parsed = JSON.parse(storedMenus);
      setMenus(parsed);
      
      // Selecionar primeiro cardápio aberto
      const openMenu = parsed.find((m: any) => m.status === "open");
      if (openMenu) {
        setSelectedMenu(openMenu);
      }
    }
  }, []);

  const handleAddToCart = (product: MenuItem) => {
    // Validar se o cardápio está aberto
    if (!selectedMenu || selectedMenu.status !== "open") {
      toast.error("❌ Cardápio fechado! Não é possível fazer vendas.");
      return;
    }

    // Validar quantidade disponível
    if (!product.isUnlimited && product.quantity !== null && product.quantity <= 0) {
      toast.error("❌ Produto sem estoque!");
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Validar quantidade máxima
      if (!product.isUnlimited && product.quantity !== null) {
        if (existingItem.quantity >= product.quantity) {
          toast.error("❌ Quantidade máxima atingida!");
          return;
        }
      }

      const updated = cart.map(item =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price,
            }
          : item
      );
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          productName: product.productName,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
        },
      ]);
    }

    toast.success(`✅ ${product.productName} adicionado ao carrinho!`);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
    toast.success("✅ Item removido do carrinho!");
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const product = selectedMenu?.items.find((p: MenuItem) => p.id === productId);
    if (product && !product.isUnlimited && product.quantity !== null && newQuantity > product.quantity) {
      toast.error("❌ Quantidade máxima atingida!");
      return;
    }

    setCart(
      cart.map(item =>
        item.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
            }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCompleteOrder = () => {
    if (cart.length === 0) {
      toast.error("❌ Carrinho vazio!");
      return;
    }

    if (!selectedMenu || selectedMenu.status !== "open") {
      toast.error("❌ Cardápio fechado! Não é possível fazer vendas.");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmOrder = () => {
    // Salvar pedido
    const sessions = JSON.parse(localStorage.getItem("cashierSessions") || "[]");
    
    const newOrder = {
      id: Date.now(),
      paymentMethod,
      total: calculateTotal(),
      items: cart,
      createdAt: new Date().toISOString(),
    };

    // Encontrar ou criar sessão para este cardápio
    let session = sessions.find((s: any) => s.weeklyMenuId === selectedMenu.id && !s.closedAt);
    
    if (!session) {
      session = {
        id: Date.now(),
        weeklyMenuId: selectedMenu.id,
        openedAt: new Date().toISOString(),
        closedAt: null,
        orders: [],
      };
      sessions.push(session);
    }

    session.orders.push(newOrder);
    localStorage.setItem("cashierSessions", JSON.stringify(sessions));

    toast.success("✅ Pedido finalizado!");
    setShowConfirm(false);
    setShowPrint(true);
    setCart([]);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const total = calculateTotal();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cupom de Venda</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; width: 80mm; }
          .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
          .items { margin: 10px 0; }
          .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ccc; }
          .total { font-weight: bold; font-size: 16px; text-align: right; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
          .payment { text-align: center; margin-top: 10px; }
          .footer { text-align: center; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LANCHONETE PDV</h2>
          <p>Cupom de Venda</p>
        </div>
        <div class="items">
          ${cart.map(item => `
            <div class="item">
              <span>${item.productName} x${item.quantity}</span>
              <span>R$ ${item.subtotal.toFixed(2)}</span>
            </div>
          `).join("")}
        </div>
        <div class="total">
          TOTAL: R$ ${total.toFixed(2)}
        </div>
        <div class="payment">
          <p>Forma de Pagamento: ${
            paymentMethod === "pix" ? "PIX" :
            paymentMethod === "card" ? "CARTÃO" :
            "DINHEIRO"
          }</p>
        </div>
        <div class="footer">
          <p>${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}</p>
          <p>Obrigado pela compra!</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    setShowPrint(false);
  };

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const openMenus = menus.filter((m: any) => m.status === "open");
  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ponto de Venda</h1>
            <p className="text-muted-foreground">Realize vendas do cardápio semanal</p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
          >
            Voltar
          </Button>
        </div>

        {/* Menu Selection */}
        {openMenus.length === 0 ? (
          <Card className="p-12 text-center mb-6">
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Nenhum Cardápio Aberto</p>
            <p className="text-muted-foreground mb-4">
              Abra um cardápio semanal para começar a vender.
            </p>
            <Button
              onClick={() => setLocation("/weekly-menu")}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Ir para Cardápios
            </Button>
          </Card>
        ) : (
          <>
            <Card className="p-4 mb-6">
              <label className="text-sm font-medium text-foreground block mb-2">
                Selecione o Cardápio
              </label>
              <select
                value={selectedMenu?.id || ""}
                onChange={(e) => {
                  const menu = menus.find((m: any) => m.id === parseInt(e.target.value));
                  setSelectedMenu(menu);
                  setCart([]);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="">Selecione um cardápio</option>
                {openMenus.map((menu: any) => (
                  <option key={menu.id} value={menu.id}>
                    {getSaturdayLabel(menu.saturdayOrder)} - {new Date(menu.saturdayDate).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </Card>

            {selectedMenu && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products */}
                <div className="lg:col-span-2">
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Produtos Disponíveis</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMenu.items.map((product: MenuItem) => (
                        <div
                          key={product.id}
                          className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{product.productName}</h3>
                            <span className="text-primary font-bold">R$ {product.price.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {product.isUnlimited ? "Ilimitado" : `${product.quantity} disponível`}
                          </p>
                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-gradient-to-r from-primary to-secondary"
                            disabled={!product.isUnlimited && product.quantity === 0}
                          >
                            Adicionar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Cart */}
                <div className="lg:col-span-1">
                  <Card className="p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Carrinho</h2>
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                          {cart.map((item) => (
                            <div key={item.id} className="p-3 bg-muted/50 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-foreground text-sm">{item.productName}</span>
                                <Button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  variant="outline"
                                  size="sm"
                                  className="px-2 h-8"
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                <Button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  variant="outline"
                                  size="sm"
                                  className="px-2 h-8"
                                >
                                  +
                                </Button>
                                <span className="ml-auto text-sm font-bold text-primary">
                                  R$ {item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border pt-3 mb-4">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold text-foreground">Total:</span>
                            <span className="text-2xl font-bold text-primary">R$ {total.toFixed(2)}</span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <label className="text-sm font-medium text-foreground block">
                              Forma de Pagamento
                            </label>
                            <div className="space-y-2">
                              {(["pix", "card", "cash"] as const).map((method) => (
                                <label key={method} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="payment"
                                    value={method}
                                    checked={paymentMethod === method}
                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm text-foreground">
                                    {method === "pix" ? "📱 PIX" : method === "card" ? "💳 Cartão" : "💵 Dinheiro"}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <Button
                            onClick={handleCompleteOrder}
                            className="w-full bg-gradient-to-r from-primary to-secondary"
                            size="lg"
                          >
                            Finalizar Pedido
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.productName} x{item.quantity}</span>
                  <span>R$ {item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Forma de Pagamento: {
                  paymentMethod === "pix" ? "PIX" :
                  paymentMethod === "card" ? "CARTÃO" :
                  "DINHEIRO"
                }
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmOrder}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
              >
                Confirmar
              </Button>
              <Button
                onClick={() => setShowConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pedido Finalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-foreground mb-2">✅ Pedido Confirmado!</p>
              <p className="text-muted-foreground">Deseja imprimir o cupom?</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                className="flex-1 bg-gradient-to-r from-primary to-secondary"
              >
                Imprimir Cupom
              </Button>
              <Button
                onClick={() => setShowPrint(false)}
                variant="outline"
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
