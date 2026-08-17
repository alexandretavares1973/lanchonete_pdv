import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart, Trash2, Lock, UserPlus } from "lucide-react";
import { DEFAULT_PAYMENT_METHOD, getExplicitCustomer } from "@shared/posOrderFlow";
import { getLowStockMessage, isLowGlobalStock } from "@shared/stockAlerts";
import { trpc } from "@/lib/trpc";


interface MenuItem {
  id: number | string;
  productName: string;
  productId?: number;
  price: number;
  quantity: number;
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

interface CartItem {
  id: string;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: Date;
}

export default function POSPage() {
  const [, setLocation] = useLocation();
  const { data: sharedMenus } = trpc.pdv.menu.list.useQuery();
  const { data: sharedCustomers } = trpc.pdv.customers.list.useQuery();
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">(DEFAULT_PAYMENT_METHOD);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [lastOrderChange, setLastOrderChange] = useState<number>(0);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [lastAmountReceived, setLastAmountReceived] = useState<number>(0);
  const [lastCustomerName, setLastCustomerName] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { data: globalProducts = [] } = trpc.pdv.products.list.useQuery();
  const utils = trpc.useUtils();
  const openSessionQuery = trpc.pdv.cashier.getOpenSession.useQuery(
    { responsibleId: Number(selectedMenu?.responsibleId || 0), weeklyMenuId: Number(selectedMenu?.id || 0) },
    { enabled: Number.isInteger(Number(selectedMenu?.responsibleId)) && Number(selectedMenu?.responsibleId) > 0 },
  );
  const openSessionMutation = trpc.pdv.cashier.openSession.useMutation();
  const createOrderMutation = trpc.pdv.orders.create.useMutation();
  const createCustomerMutation = trpc.pdv.customers.create.useMutation({
    onSuccess: async (customer) => {
      await utils.pdv.customers.list.invalidate();
      if (customer) setSelectedCustomer(customer as Customer);
      setShowQuickCustomerDialog(false);
      setQuickCustomerForm({ name: "", phone: "", email: "" });
      toast.success(`✅ Cliente "${customer?.name || "novo"}" cadastrado e selecionado.`);
    },
    onError: (error) => toast.error(error.message || "Não foi possível cadastrar o cliente."),
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showQuickCustomerDialog, setShowQuickCustomerDialog] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({ name: "", phone: "", email: "" });
  const [shouldFocusCustomer, setShouldFocusCustomer] = useState(false);
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const quickCustomerNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const menusFromServer = sharedMenus ?? [];
    setMenus(menusFromServer);
    const openMenusList = menusFromServer.filter((m: any) => m.status === "open");
    setSelectedMenu((current: any) => {
      if (current && openMenusList.some((menu: any) => menu.id === current.id)) {
        return openMenusList.find((menu: any) => menu.id === current.id) || current;
      }
      // Nenhum cardápio pré-selecionado automaticamente: escolha manual obrigatória
      return openMenusList.length === 1 ? openMenusList[0] : null;
    });
  }, [sharedMenus]);

  useEffect(() => {
    setCustomers((sharedCustomers ?? []) as Customer[]);
  }, [sharedCustomers]);

  useEffect(() => {
    if (!showQuickCustomerDialog) return;
    const timeoutId = window.setTimeout(() => quickCustomerNameRef.current?.focus(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [showQuickCustomerDialog]);

  useEffect(() => {
    if (!shouldFocusCustomer || showPrint || showQuickCustomerDialog) return;
    const timeoutId = window.setTimeout(() => {
      customerSelectRef.current?.focus();
      setShouldFocusCustomer(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [shouldFocusCustomer, showPrint, showQuickCustomerDialog]);

  const handleOpenQuickCustomerDialog = () => {
    setQuickCustomerForm({ name: "", phone: "", email: "" });
    setShowQuickCustomerDialog(true);
  };

  const handleQuickCustomerSubmit = () => {
    const name = quickCustomerForm.name.trim();
    if (!name) {
      toast.error("❌ Nome do cliente é obrigatório!");
      quickCustomerNameRef.current?.focus();
      return;
    }

    const normalizedName = name.toLocaleLowerCase();
    const existingCustomer = customers.find((customer) => customer.name.trim().toLocaleLowerCase() === normalizedName);
    if (existingCustomer) {
      setSelectedCustomer(existingCustomer);
      setShowQuickCustomerDialog(false);
      toast.success(`Cliente "${existingCustomer.name}" já existia e foi selecionado.`);
      return;
    }

    createCustomerMutation.mutate({
      name,
      phone: quickCustomerForm.phone.trim() || undefined,
      email: quickCustomerForm.email.trim() || undefined,
    });
  };

  const findGlobalProduct = (menuItem: MenuItem) => {
    const productId = Number(menuItem.productId ?? menuItem.id);
    return globalProducts.find((product) =>
      (Number.isInteger(productId) && product.id === productId) ||
      product.name.trim().toLocaleLowerCase() === menuItem.productName.trim().toLocaleLowerCase()
    );
  };

  const getCartQuantity = (product: MenuItem) =>
    cart.find((item) => item.id === String(product.id))?.quantity || 0;

  const getRemainingMenuQuantity = (product: MenuItem) =>
    Math.max(0, Number(product.quantity || 0) - getCartQuantity(product));

  const handleAddToCart = (product: MenuItem) => {
    const openMenusList = menus.filter((m: any) => m.status === "open");
    if (openMenusList.length > 1 && !selectedMenu) {
      toast.error("⚠️ Existem múltiplos cardápios abertos. Selecione o cardápio antes de adicionar itens.");
      return;
    }

    if (!selectedMenu || selectedMenu.status !== "open") {
      toast.error("❌ Cardápio fechado ou não selecionado! Não é possível fazer vendas.");
      return;
    }

    const remainingQuantity = getRemainingMenuQuantity(product);
    if (remainingQuantity <= 0) {
      toast.error("❌ Quantidade máxima atingida!");
      return;
    }

    const existingItem = cart.find((item) => item.id === String(product.id));
    if (existingItem) {
      setCart(cart.map((item) => item.id === String(product.id)
        ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
        : item));
    } else {
      setCart([...cart, {
        id: String(product.id),
        productId: Number(product.productId ?? findGlobalProduct(product)?.id ?? 0),
        productName: product.productName,
        price: product.price,
        quantity: 1,
        subtotal: product.price,
      }]);
    }

    toast.success(`✅ ${product.productName} adicionado ao carrinho!`);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
    toast.success("✅ Item removido do carrinho!");
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const currentItem = cart.find((item) => item.id === productId);
    const product = selectedMenu?.items.find((p: MenuItem) => String(p.id) === productId);

    if (currentItem && product && newQuantity > product.quantity) {
      toast.error("❌ Quantidade máxima atingida!");
      return;
    }

    setCart(
      cart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
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

    const openMenusList = menus.filter((m: any) => m.status === "open");
    if (openMenusList.length > 1 && !selectedMenu) {
      toast.error("⚠️ Selecione de qual cardápio a venda será feita.");
      return;
    }

    if (!selectedMenu || selectedMenu.status !== "open") {
      toast.error("❌ Cardápio fechado ou não selecionado! Não é possível fazer vendas.");
      return;
    }

    const customer = getExplicitCustomer(selectedCustomer);
    if (!customer) {
      toast.error("Selecione um cliente antes de finalizar a venda");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    const customer = getExplicitCustomer(selectedCustomer);
    if (!customer) {
      setShowConfirm(false);
      toast.error("Selecione um cliente antes de finalizar a venda");
      return;
    }

    const total = calculateTotal();
    
    // Validar pagamento em dinheiro
    if (paymentMethod === "cash" && amountReceived < total) {
      toast.error("❌ Valor recebido é menor que o total!");
      return;
    }

    // Calcular troco
    const change = paymentMethod === "cash" ? amountReceived - total : 0;
    setLastOrderChange(change);

    const lowStockAfterSale = cart.flatMap((item) => {
      const globalProduct = globalProducts.find((product) =>
        product.name.trim().toLocaleLowerCase() === item.productName.trim().toLocaleLowerCase()
      );
      if (!globalProduct || globalProduct.quantity === null) return [];
      const remainingQuantity = Number(globalProduct.quantity) - item.quantity;
      return isLowGlobalStock(globalProduct, remainingQuantity)
        ? [{ productName: globalProduct.name }]
        : [];
    });

        const responsibleId = Number(selectedMenu.responsibleId);
    const productItems = cart.map((item) => ({
      productId: Number(item.productId),
      quantity: item.quantity,
      unitPrice: item.price,
    }));
    if (productItems.some((item) => !Number.isInteger(item.productId) || item.productId <= 0)) {
      toast.error("Não foi possível identificar um produto oficial do cardápio.");
      return;
    }

    try {
      let cashierSessionId = openSessionQuery.data?.id;
      if (!cashierSessionId) {
        const session = await openSessionMutation.mutateAsync({ responsibleId, weeklyMenuId: selectedMenu.id, initialBalance: 0 });
        cashierSessionId = session?.id;
      }
      if (!cashierSessionId) throw new Error("Não foi possível abrir a sessão de caixa compartilhada.");

      await createOrderMutation.mutateAsync({
        cashierSessionId,
        weeklyMenuId: selectedMenu.id,
        customerId: customer.id,
        paymentMethod,
        items: productItems,
      });
      await Promise.all([
        utils.pdv.menu.list.invalidate(),
        utils.pdv.products.list.invalidate(),
        utils.pdv.cashier.getOpenSession.invalidate(),
      ]);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível registrar a venda no banco compartilhado.");
      return;
    }

    // Salvar itens do pedido para impressão
    setLastOrderItems(cart);
    setLastOrderTotal(total);
    setLastPaymentMethod(paymentMethod);
    setLastAmountReceived(paymentMethod === "cash" ? amountReceived : 0);
    setLastCustomerName(customer.name);

    toast.success("✅ Pedido finalizado!");
    lowStockAfterSale.forEach(({ productName }) => {
      toast.warning(getLowStockMessage(productName));
    });
    setShowConfirm(false);
    setShowPrint(true);
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod(DEFAULT_PAYMENT_METHOD);
    setAmountReceived(0);
    // Se houver mais de um cardápio aberto, resetamos a seleção do cardápio para forçar escolha no próximo pedido
    const openMenusList = menus.filter((m: any) => m.status === "open");
    if (openMenusList.length > 1) {
      setSelectedMenu(null);
    }
    setShouldFocusCustomer(true);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const total = lastOrderTotal;
    const paymentLabel = lastPaymentMethod === "pix" ? "PIX" : lastPaymentMethod === "card" ? "CARTÃO" : "DINHEIRO";
    const timestamp = new Date();
    const itemsToPrint = lastOrderItems.length > 0 ? lastOrderItems : cart;

    const itemsHtml = itemsToPrint.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #999;">
        <div style="flex: 1;">
          <div style="font-weight: bold;">${item.productName}</div>
          <div style="font-size: 11px; color: #666;">Qtd: ${item.quantity} x R$ ${item.price.toFixed(2)}</div>
        </div>
        <div style="text-align: right; font-weight: bold; min-width: 70px;">R$ ${item.subtotal.toFixed(2)}</div>
      </div>
    `).join("");

    const changeSection = lastPaymentMethod === "cash" ? `
      <div class="summary">
        <div class="summary-row">
          <span><strong>Valor Recebido:</strong></span>
          <span>R$ ${lastAmountReceived.toFixed(2)}</span>
        </div>
        <div class="summary-row" style="color: #2ecc71; font-weight: bold;">
          <span>TROCO:</span>
          <span>R$ ${lastOrderChange.toFixed(2)}</span>
        </div>
      </div>
    ` : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cupom de Venda</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            background: white; 
            color: #000;
            padding: 10px;
          }
          .container { 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10px;
            background: white;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
          }
          .header h1 { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .header p { 
            font-size: 11px; 
            margin: 3px 0; 
          }
          .divider { 
            border-bottom: 2px solid #000; 
            margin: 10px 0; 
          }
          .section-title { 
            font-weight: bold; 
            font-size: 12px; 
            margin-top: 12px; 
            margin-bottom: 8px; 
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
          }
          .items { margin: 10px 0; }
          .item { 
            display: flex; 
            justify-content: space-between; 
            font-size: 12px; 
            margin: 8px 0; 
            padding: 5px 0; 
            border-bottom: 1px dotted #999; 
          }
          .item-name { 
            flex: 1; 
            font-weight: bold;
          }
          .item-qty { 
            font-size: 11px; 
            color: #666;
            margin-top: 2px;
          }
          .item-total { 
            text-align: right; 
            font-weight: bold; 
            min-width: 70px; 
          }
          .summary { 
            font-size: 11px; 
            margin: 10px 0; 
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0; 
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            font-size: 13px; 
            font-weight: bold; 
            margin: 10px 0; 
            padding: 8px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
          }
          .payment-info { 
            text-align: center; 
            font-size: 11px; 
            margin: 10px 0; 
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            font-size: 10px; 
            margin-top: 15px; 
            padding-top: 10px; 
          }
          @media print { 
            body { margin: 0; padding: 0; } 
            .container { width: 80mm; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LANCHONETE PDV</h1>
            <p>CUPOM DE VENDA</p>
            <p>━━━━━━━━━━━━━━━━━━━━━━━</p>
            <p><strong>Cardápio:</strong> ${selectedMenu ? getSaturdayLabel(selectedMenu.saturdayOrder) : "N/A"}</p>
            <p><strong>Cliente:</strong> ${lastCustomerName && lastCustomerName.trim() ? lastCustomerName.trim() : "GERAL"}</p>
            <p><strong>Data:</strong> ${timestamp.toLocaleDateString("pt-BR")}</p>
            <p><strong>Hora:</strong> ${timestamp.toLocaleTimeString("pt-BR")}</p>
          </div>

          <div class="section-title">PRODUTOS COMPRADOS</div>
          <div class="items">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div class="summary">
            <div class="summary-row">
              <span><strong>Total de Itens:</strong></span>
              <span>${itemsToPrint.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
          </div>

          <div class="total-row">
            <span>TOTAL:</span>
            <span>R$ ${total.toFixed(2)}</span>
          </div>

          <div class="payment-info">
            <strong>Forma de Pagamento:</strong><br>
            ${paymentLabel}
          </div>

          ${changeSection}

          <div class="footer">
            <p>━━━━━━━━━━━━━━━━━━━━━━━</p>
            <p>Obrigado pela compra!</p>
            <p style="margin-top: 10px;">Volte sempre!</p>
          </div>
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

            <Card className="p-4 mb-6">
              <label htmlFor="pos-customer-select" className="text-sm font-medium text-foreground block mb-2">
                Selecione o Cliente
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="pos-customer-select"
                  ref={customerSelectRef}
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const customer = customers.find((c: Customer) => c.id === parseInt(e.target.value));
                    setSelectedCustomer(customer || null);
                  }}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">Selecione um cliente</option>
                  {customers.filter((c: Customer) => c.isActive !== false).map((customer: Customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.isDefault ? "(Padrão)" : ""}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenQuickCustomerDialog}
                  className="shrink-0 gap-1"
                  aria-label="Cadastrar novo cliente"
                  title="Cadastrar novo cliente"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo cliente</span>
                </Button>
              </div>
            </Card>

            {selectedMenu && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products */}
                <div className="lg:col-span-2">
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Produtos Disponíveis</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMenu.items.map((product: MenuItem) => {
                        const globalProduct = findGlobalProduct(product);
                        const cartQuantity = cart.find((item) => item.id === String(product.id))?.quantity || 0;
                        const menuRemainingQuantity = getRemainingMenuQuantity(product);
                        const globalRemainingQuantity = globalProduct
                          ? Number(globalProduct.quantity) - cartQuantity
                          : 0;
                        const lowGlobalStock = globalProduct
                          ? isLowGlobalStock(globalProduct, globalRemainingQuantity)
                          : false;
                        return (
                        <div
                          key={product.id}
                          className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{product.productName}</h3>
                            <span className="text-primary font-bold">R$ {product.price.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {menuRemainingQuantity} disponível(is) neste cardápio
                          </p>
                          {lowGlobalStock && globalProduct && (
                            <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900" role="alert">
                              {getLowStockMessage(globalProduct.name)}
                            </p>
                          )}
                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                            disabled={menuRemainingQuantity <= 0}
                          >
                            Adicionar
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* Cart */}
                <div>
                  <Card className="p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Carrinho</h2>
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Carrinho vazio</p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                          {cart.map((item) => (
                            <div key={item.id} className="p-3 border border-border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-foreground text-sm">{item.productName}</h3>
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  className="px-2 py-1 border border-border rounded text-sm"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center text-sm font-semibold">{item.quantity}</span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  className="px-2 py-1 border border-border rounded text-sm"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">R$ {item.price.toFixed(2)}</span>
                                <span className="font-bold text-primary">R$ {item.subtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border pt-4 mb-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-foreground">Subtotal:</span>
                            <span className="font-bold">R$ {total.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <label className="text-sm font-medium text-foreground block">
                            Forma de Pagamento
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as "pix" | "card" | "cash")}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="pix">PIX</option>
                            <option value="card">CARTÃO</option>
                            <option value="cash">DINHEIRO</option>
                          </select>
                        </div>

                        {paymentMethod === "cash" && (
                          <div className="space-y-3 mb-4 p-3 bg-primary/10 rounded-lg">
                            <label className="text-sm font-medium text-foreground block">
                              Valor Recebido
                            </label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={amountReceived || ""}
                              onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                              className="text-foreground"
                              step="0.01"
                              min="0"
                            />
                            {amountReceived > 0 && (
                              <div className="p-2 bg-green-100 rounded text-green-800 text-sm font-semibold">
                                Troco: R$ {(amountReceived - total).toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={handleCompleteOrder}
                          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold"
                        >
                          Finalizar Pedido
                        </Button>
                      </>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirmar Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Total do Pedido:</p>
                <p className="text-3xl font-bold text-primary">R$ {total.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-secondary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Forma de Pagamento:</p>
                <p className="text-lg font-semibold text-foreground">
                  {paymentMethod === "pix" ? "PIX" : paymentMethod === "card" ? "CARTÃO" : "DINHEIRO"}
                </p>
              </div>
              {paymentMethod === "cash" && (
                <div className="p-4 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800 mb-2">Valor Recebido:</p>
                  <p className="text-lg font-semibold text-green-800">R$ {amountReceived.toFixed(2)}</p>
                  <p className="text-sm text-green-800 mt-2">Troco: R$ {(amountReceived - total).toFixed(2)}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmOrder}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Customer Dialog */}
        <Dialog
          open={showQuickCustomerDialog}
          onOpenChange={(open) => {
            setShowQuickCustomerDialog(open);
            if (!open) setQuickCustomerForm({ name: "", phone: "", email: "" });
          }}
        >
          <DialogContent className="sm:max-w-md bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Cadastrar novo cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="quick-customer-name" className="text-sm font-medium text-foreground block mb-2">
                  Nome do cliente *
                </label>
                <Input
                  id="quick-customer-name"
                  ref={quickCustomerNameRef}
                  placeholder="Ex: João Silva"
                  value={quickCustomerForm.name}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickCustomerSubmit();
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="quick-customer-phone" className="text-sm font-medium text-foreground block mb-2">
                  Telefone
                </label>
                <Input
                  id="quick-customer-phone"
                  placeholder="Ex: (11) 98765-4321"
                  value={quickCustomerForm.phone}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="quick-customer-email" className="text-sm font-medium text-foreground block mb-2">
                  Email
                </label>
                <Input
                  id="quick-customer-email"
                  type="email"
                  placeholder="Ex: joao@email.com"
                  value={quickCustomerForm.email}
                  onChange={(e) => setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickCustomerDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleQuickCustomerSubmit}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Cadastrar e selecionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        <Dialog open={showPrint} onOpenChange={setShowPrint}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Imprimir Cupom?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">Deseja imprimir o cupom do pedido?</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPrint(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Não
                </Button>
                <Button
                  onClick={handlePrint}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Imprimir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
