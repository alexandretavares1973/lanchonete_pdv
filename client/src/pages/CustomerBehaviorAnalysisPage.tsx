import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MenuItem {
  id: string;
  productName: string;
  price: number;
  quantity: number | null;
  isUnlimited: boolean;
}

interface OrderItem {
  id?: string;
  productId?: number;
  productName: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  subtotal: number;
}

interface Order {
  id: number;
  customerId?: number;
  customerName?: string;
  paymentMethod: "pix" | "card" | "cash";
  total: number;
  items: OrderItem[];
  createdAt: string;
}

interface CashierSession {
  id: number;
  weeklyMenuId: number;
  openedAt: string;
  closedAt: string | null;
  orders: Order[];
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

interface CustomerBehavior {
  customer: Customer;
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  purchaseFrequency: number;
  favoriteProducts: { name: string; quantity: number; percentage: number }[];
  paymentMethods: { method: string; count: number; percentage: number }[];
  lastPurchase?: string;
  firstPurchase?: string;
}

export default function CustomerBehaviorAnalysisPage() {
  const [, setLocation] = useLocation();
  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [behaviors, setBehaviors] = useState<CustomerBehavior[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<"spending" | "frequency" | "recent">("spending");
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<string[]>([]);

  useEffect(() => {
    const storedSessions = localStorage.getItem("cashierSessions");
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    }

    const storedCustomers = localStorage.getItem("customers");
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    }
  }, []);

  useEffect(() => {
    const products = new Set<string>();
    sessions.forEach((session) => {
      session.orders?.forEach((order) => {
        order.items?.forEach((item) => {
          products.add(item.productName);
        });
      });
    });
    setAllProducts(Array.from(products).sort());
  }, [sessions]);

  useEffect(() => {
    if (sessions.length === 0 || customers.length === 0) return;

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const start = startDate ? new Date(startDate) : thirtyDaysAgo;
    const end = endDate ? new Date(endDate) : today;

    // Mapear comportamento de compra por cliente
    const behaviorMap = new Map<number, CustomerBehavior>();

    customers.forEach((customer) => {
      behaviorMap.set(customer.id, {
        customer,
        totalPurchases: 0,
        totalSpent: 0,
        averageTicket: 0,
        purchaseFrequency: 0,
        favoriteProducts: [],
        paymentMethods: [],
        lastPurchase: undefined,
        firstPurchase: undefined,
      });
    });

    // Processar todas as sessões e pedidos
    sessions.forEach((session) => {
      const sessionDate = new Date(session.openedAt);
      if (sessionDate < start || sessionDate > end) return;

      session.orders?.forEach((order) => {
        const customerId = order.customerId || 1; // Usar GERAL se não houver customerId
        const behavior = behaviorMap.get(customerId);

        if (behavior) {
          behavior.totalPurchases += 1;
          behavior.totalSpent += order.total;
          behavior.lastPurchase = order.createdAt;
          if (!behavior.firstPurchase) {
            behavior.firstPurchase = order.createdAt;
          }

          // Rastrear métodos de pagamento
          const paymentMethod = order.paymentMethod;
          const existingPayment = behavior.paymentMethods.find(p => p.method === paymentMethod);
          if (existingPayment) {
            existingPayment.count += 1;
          } else {
            behavior.paymentMethods.push({ method: paymentMethod, count: 1, percentage: 0 });
          }

          // Rastrear produtos favoritos
          order.items?.forEach((item) => {
            const productName = item.productName;
            const existingProduct = behavior.favoriteProducts.find(p => p.name === productName);
            if (existingProduct) {
              existingProduct.quantity += item.quantity;
            } else {
              behavior.favoriteProducts.push({ name: productName, quantity: item.quantity, percentage: 0 });
            }
          });
        }
      });
    });

    // Calcular percentuais e ticket médio
    behaviorMap.forEach((behavior) => {
      if (behavior.totalPurchases > 0) {
        behavior.averageTicket = behavior.totalSpent / behavior.totalPurchases;
        behavior.purchaseFrequency = behavior.totalPurchases;

        // Calcular percentual de produtos
        const totalProductQuantity = behavior.favoriteProducts.reduce((sum, p) => sum + p.quantity, 0);
        behavior.favoriteProducts.forEach((product) => {
          product.percentage = (product.quantity / totalProductQuantity) * 100;
        });
        behavior.favoriteProducts.sort((a, b) => b.quantity - a.quantity).slice(0, 5);

        // Calcular percentual de métodos de pagamento
        behavior.paymentMethods.forEach((payment) => {
          payment.percentage = (payment.count / behavior.totalPurchases) * 100;
        });
      }
    });

    // Converter para array e ordenar
    let sortedBehaviors = Array.from(behaviorMap.values()).filter(b => b.totalPurchases > 0);

    if (sortBy === "spending") {
      sortedBehaviors.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === "frequency") {
      sortedBehaviors.sort((a, b) => b.totalPurchases - a.totalPurchases);
    } else if (sortBy === "recent") {
      sortedBehaviors.sort((a, b) => {
        const dateA = new Date(b.lastPurchase || "").getTime();
        const dateB = new Date(a.lastPurchase || "").getTime();
        return dateA - dateB;
      });
    }

    setBehaviors(sortedBehaviors);
  }, [sessions, customers, startDate, endDate, sortBy]);

  const handleExportCSV = () => {
    const csvContent = [
      ["Cliente", "Telefone", "Email", "Total de Compras", "Valor Total", "Ticket Médio", "Produtos Favoritos", "Última Compra", "Primeira Compra"],
      ...behaviors.map((behavior) => [
        behavior.customer.name,
        behavior.customer.phone || "",
        behavior.customer.email || "",
        behavior.totalPurchases,
        `R$ ${behavior.totalSpent.toFixed(2)}`,
        `R$ ${behavior.averageTicket.toFixed(2)}`,
        behavior.favoriteProducts.slice(0, 3).map(p => `${p.name} (${p.quantity}x)`).join("; ") || "N/A",
        behavior.lastPurchase ? new Date(behavior.lastPurchase).toLocaleDateString("pt-BR") : "N/A",
        behavior.firstPurchase ? new Date(behavior.firstPurchase).toLocaleDateString("pt-BR") : "N/A",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analise-comportamento-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("✅ Análise exportada com sucesso!");
  };

  const selectedBehavior = behaviors.find(b => b.customer.id === selectedCustomer);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">Relatório de Vendas</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "spending" | "frequency" | "recent")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="spending">Maior Gasto</option>
                <option value="frequency">Mais Frequente</option>
                <option value="recent">Mais Recente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cliente
              </label>
              <select
                value={selectedCustomer || ""}
                onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Todos os clientes</option>
                {behaviors.map((behavior) => (
                  <option key={behavior.customer.id} value={behavior.customer.id}>
                    {behavior.customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Produto
              </label>
              <select
                value={selectedProduct || ""}
                onChange={(e) => setSelectedProduct(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Todos os produtos</option>
                {allProducts.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Tabela de Comportamento */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Comportamento de Compra</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Compras</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Total Gasto</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Ticket Médio</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Produtos Favoritos</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Última Compra</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Primeira Compra</th>
                </tr>
              </thead>
              <tbody>
                {behaviors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Nenhum dado de compra encontrado no período selecionado
                    </td>
                  </tr>
                ) : (
                  behaviors
                    .filter(b => !selectedCustomer || b.customer.id === selectedCustomer)
                    .map((behavior, idx) => (
                      <tr
                        key={behavior.customer.id}
                        className={`cursor-pointer hover:bg-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                        onClick={() => setSelectedCustomer(behavior.customer.id)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {behavior.customer.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                          {behavior.totalPurchases}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                          R$ {behavior.totalSpent.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                          R$ {behavior.averageTicket.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div className="space-y-1">
                            {behavior.favoriteProducts.slice(0, 3).map((product, pidx) => (
                              <div key={pidx} className="text-xs">
                                <span className="font-medium">{product.name}</span>
                                <span className="text-slate-500"> ({product.quantity}x)</span>
                              </div>
                            ))}
                            {behavior.favoriteProducts.length === 0 && <span>-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {behavior.lastPurchase ? new Date(behavior.lastPurchase).toLocaleDateString("pt-BR") : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {behavior.firstPurchase ? new Date(behavior.firstPurchase).toLocaleDateString("pt-BR") : "N/A"}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Detalhes do Cliente Selecionado */}
        {selectedBehavior && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Detalhes - {selectedBehavior.customer.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="p-4 bg-blue-50">
                <p className="text-sm text-slate-600 mb-1">Produtos Favoritos</p>
                <div className="space-y-2">
                  {selectedBehavior.favoriteProducts.slice(0, 3).map((product, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-600">
                        {product.quantity} unidades ({product.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4 bg-green-50">
                <p className="text-sm text-slate-600 mb-1">Métodos de Pagamento</p>
                <div className="space-y-2">
                  {selectedBehavior.paymentMethods.map((payment, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-slate-900 capitalize">{payment.method}</p>
                      <p className="text-xs text-slate-600">
                        {payment.count} transações ({payment.percentage.toFixed(1)}%)
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4 bg-purple-50">
                <p className="text-sm text-slate-600 mb-1">Informações de Contato</p>
                <div className="space-y-2">
                  <div className="text-sm">
                    <p className="text-xs text-slate-600">Telefone</p>
                    <p className="font-medium text-slate-900">{selectedBehavior.customer.phone || "N/A"}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-xs text-slate-600">Email</p>
                    <p className="font-medium text-slate-900 break-all">{selectedBehavior.customer.email || "N/A"}</p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        )}

        {/* Gráficos de Análise */}
        {behaviors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Clientes por Valor de Compra</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={behaviors.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="customer.name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `R$ ${typeof value === 'number' ? value.toFixed(2) : value}`} />
                  <Bar dataKey="totalSpent" fill="#3b82f6" name="Total Gasto" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Frequência de Compra</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={behaviors.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="customer.name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalPurchases" fill="#10b981" name="Compras" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Resumo Geral */}
        {behaviors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Total de Clientes Ativos</p>
              <p className="text-2xl font-bold text-slate-900">{behaviors.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Total de Compras</p>
              <p className="text-2xl font-bold text-slate-900">
                {behaviors.reduce((sum, b) => sum + b.totalPurchases, 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {behaviors.reduce((sum, b) => sum + b.totalSpent, 0).toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Ticket Médio Geral</p>
              <p className="text-2xl font-bold text-slate-900">
                R$ {(behaviors.reduce((sum, b) => sum + b.totalSpent, 0) / behaviors.reduce((sum, b) => sum + b.totalPurchases, 0)).toFixed(2)}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
