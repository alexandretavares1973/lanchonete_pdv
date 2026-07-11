import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  createdAt: Date;
}

interface Order {
  id: number;
  customerId?: number;
  total: number;
  paymentMethod: "pix" | "card" | "cash";
  createdAt: string;
  items?: Array<{productName: string; quantity: number; price?: number}>;
}

interface CashierSession {
  id: number;
  weeklyMenuId: number;
  openedAt: string;
  closedAt: string | null;
  orders: Order[];
}

interface CustomerStats {
  customer: Customer;
  orderCount: number;
  totalSpent: number;
  lastOrder?: Date;
  averageOrderValue: number;
}

export default function CustomerReportPage() {
  const [, setLocation] = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<CustomerStats[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<"frequency" | "spending">("spending");

  useEffect(() => {
    // Carregar clientes do localStorage
    const storedCustomers = localStorage.getItem("customers");
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    }

    // Carregar pedidos de cashierSessions
    const storedSessions = localStorage.getItem("cashierSessions");
    if (storedSessions) {
      const sessions: CashierSession[] = JSON.parse(storedSessions);
      const allOrders: Order[] = [];
      sessions.forEach((session) => {
        if (session.orders) {
          allOrders.push(...session.orders);
        }
      });
      setOrders(allOrders);
    }

    // Definir período padrão (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    // Calcular estatísticas
    const statsMap = new Map<number, CustomerStats>();

    customers.forEach((customer) => {
      statsMap.set(customer.id, {
        customer,
        orderCount: 0,
        totalSpent: 0,
        averageOrderValue: 0,
      });
    });

    // Filtrar pedidos por período
    const filteredOrders = orders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return orderDate >= start && orderDate <= end;
    });

    // Contar pedidos e valor gasto por cliente
    filteredOrders.forEach((order) => {
      const customerId = order.customerId || 1; // Cliente GERAL padrão
      const stat = statsMap.get(customerId);

      if (stat) {
        stat.orderCount += 1;
        stat.totalSpent += order.total || 0;
        stat.lastOrder = new Date(order.createdAt);
      }
    });

    // Calcular média
    statsMap.forEach((stat) => {
      if (stat.orderCount > 0) {
        stat.averageOrderValue = stat.totalSpent / stat.orderCount;
      }
    });

    // Converter para array e ordenar
    let sortedStats = Array.from(statsMap.values());

    if (sortBy === "frequency") {
      sortedStats.sort((a, b) => b.orderCount - a.orderCount);
    } else {
      sortedStats.sort((a, b) => b.totalSpent - a.totalSpent);
    }

    setStats(sortedStats);
  }, [customers, orders, startDate, endDate, sortBy]);

  const handleExportCSV = () => {
    const csvContent = [
      ["Cliente", "Telefone", "Email", "Pedidos", "Total Gasto", "Ticket Médio", "Último Pedido"],
      ...stats.map((stat) => [
        stat.customer.name,
        stat.customer.phone || "",
        stat.customer.email || "",
        stat.orderCount.toString(),
        `R$ ${stat.totalSpent.toFixed(2)}`,
        `R$ ${stat.averageOrderValue.toFixed(2)}`,
        stat.lastOrder ? new Date(stat.lastOrder).toLocaleDateString("pt-BR") : "N/A",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-clientes-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("✅ Relatório exportado com sucesso!");
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

        // Pular header
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
              isActive: true,
              createdAt: new Date(),
            });
          }
        }

        // Mesclar com clientes existentes
        const mergedCustomers = [...customers];
        newCustomers.forEach((newCustomer) => {
          if (!mergedCustomers.find((c) => c.name === newCustomer.name)) {
            mergedCustomers.push(newCustomer);
          }
        });

        localStorage.setItem("customers", JSON.stringify(mergedCustomers));
        setCustomers(mergedCustomers);

        toast.success(`✅ ${newCustomers.length} cliente(s) importado(s) com sucesso!`);
      } catch (error) {
        toast.error("❌ Erro ao importar arquivo CSV!");
        console.error(error);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
            <h1 className="text-3xl font-bold text-slate-900">Relatório de Clientes</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
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

        {/* Filtros */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "frequency" | "spending")}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value="spending">Maior Gasto</option>
                <option value="frequency">Mais Frequente</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const today = new Date();
                  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
                  setEndDate(today.toISOString().split("T")[0]);
                }}
              >
                Últimos 30 dias
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabela de Resultados */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                    Pedidos
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                    Total Gasto
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                    Ticket Médio
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Último Pedido
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Nenhum cliente encontrado no período selecionado
                    </td>
                  </tr>
                ) : (
                  stats.map((stat, idx) => (
                    <tr
                      key={stat.customer.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {stat.customer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {stat.customer.phone || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {stat.customer.email || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-slate-900">
                        {stat.orderCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                        R$ {stat.totalSpent.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-600">
                        R$ {stat.averageOrderValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {stat.lastOrder
                          ? new Date(stat.lastOrder).toLocaleDateString("pt-BR")
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Resumo */}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Total de Clientes</p>
              <p className="text-2xl font-bold text-slate-900">{stats.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Total de Pedidos</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.reduce((sum, s) => sum + s.orderCount, 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {stats.reduce((sum, s) => sum + s.totalSpent, 0).toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-600 mb-1">Ticket Médio Geral</p>
              <p className="text-2xl font-bold text-slate-900">
                R${" "}
                {(() => {
                  const totalOrders = stats.reduce((sum, s) => sum + s.orderCount, 0);
                  const totalSpent = stats.reduce((sum, s) => sum + s.totalSpent, 0);
                  return totalOrders > 0 ? (totalSpent / totalOrders).toFixed(2) : "0.00";
                })()}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
