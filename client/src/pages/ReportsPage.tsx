import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

interface SalesReport {
  date: string;
  totalSales: number;
  pixSales: number;
  cardSales: number;
  cashSales: number;
  itemsSold: number;
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [reports] = useState<SalesReport[]>([
    {
      date: "09/06/2026",
      totalSales: 1250.00,
      pixSales: 450.00,
      cardSales: 500.00,
      cashSales: 300.00,
      itemsSold: 45,
    },
    {
      date: "02/06/2026",
      totalSales: 980.00,
      pixSales: 350.00,
      cardSales: 400.00,
      cashSales: 230.00,
      itemsSold: 38,
    },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatorios de Vendas</h1>
            <p className="text-muted-foreground">Analise suas vendas e receitas</p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
          >
            Voltar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total de Vendas</p>
            <p className="text-3xl font-bold text-primary">R$ 2.230,00</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Recebido via PIX</p>
            <p className="text-3xl font-bold text-blue-500">R$ 800,00</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Recebido via Cartao</p>
            <p className="text-3xl font-bold text-purple-500">R$ 900,00</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Recebido em Dinheiro</p>
            <p className="text-3xl font-bold text-green-500">R$ 530,00</p>
          </Card>
        </div>

        {/* Reports Table */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Historico de Vendas</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">PIX</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Cartao</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Dinheiro</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Itens</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-foreground">{report.date}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">R$ {report.totalSales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-blue-500">R$ {report.pixSales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-purple-500">R$ {report.cardSales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-green-500">R$ {report.cashSales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-foreground">{report.itemsSold}</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Export Options */}
        <div className="mt-6 flex gap-2">
          <Button className="bg-gradient-to-r from-primary to-secondary">
            Exportar PDF
          </Button>
          <Button variant="outline">
            Exportar Excel
          </Button>
          <Button variant="outline">
            Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}
