import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, DatabaseZap, Loader2, ShieldCheck, TestTube2, Printer } from "lucide-react";
import { testPrinterCutAndPrint, getPrintHistory, clearPrintHistory, printViaWebBluetooth, printViaWebSerial, PrintLogEntry } from "@/lib/thermalPrinter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [showTestDataDialog, setShowTestDataDialog] = useState(false);
  const [printerName, setPrinterName] = useState(() => localStorage.getItem("thermal_printer_name") || "Nenhuma impressora selecionada");
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("auto_print_thermal") === "true");
  const [customHeader, setCustomHeader] = useState(() => localStorage.getItem("thermal_header") || "LANCHONETE PDV\nSistema de Vendas");
  const [customFooter, setCustomFooter] = useState(() => localStorage.getItem("thermal_footer") || "Obrigado pela preferencia!\nVolte sempre!");

  const handleSavePrinter = () => {
    localStorage.setItem("thermal_printer_name", printerName);
    localStorage.setItem("auto_print_thermal", String(autoPrint));
    localStorage.setItem("thermal_header", customHeader);
    localStorage.setItem("thermal_footer", customFooter);
    toast.success("✅ Configurações de impressora térmica salvas com sucesso!");
  };

  const [printHistory, setPrintHistory] = useState(() => {
    const existing = getPrintHistory();
    if (existing.length === 0) {
      const sample: PrintLogEntry = {
        id: "sample1",
        timestamp: new Date().toISOString(),
        orderId: "EXEMPLO",
        customerName: "CLIENTE TESTE",
        total: 25.00,
        method: "Bluetooth",
        status: "Sucesso",
        error: undefined,
        data: {
          orderId: "EXEMPLO",
          createdAt: new Date(),
          customerName: "CLIENTE TESTE",
          items: [{ productName: "X-Salada Teste", quantity: 1, price: 25.00, subtotal: 25.00 }],
          total: 25.00,
          paymentMethod: "PIX"
        }
      };
      localStorage.setItem("thermal_print_history", JSON.stringify([sample]));
      return [sample];
    }
    return existing;
  });

  const refreshHistory = () => {
    setPrintHistory(getPrintHistory());
  };

  const utils = trpc.useUtils();
  const generateTestDataMutation = trpc.settings.generateTestData.useMutation({
    onSuccess: async (result) => {
          await Promise.all([
        utils.pdv.products.list.invalidate(),
        utils.pdv.customers.list.invalidate(),
        utils.pdv.customers.getDefault.invalidate(),
        utils.pdv.menu.getByDate.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
        utils.pdv.orders.getBySession.invalidate(),
        utils.pdv.cashier.getOpenSession.invalidate(),
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
      ]);
      toast.success(`${result.summary.orders} pedidos de teste gerados com sucesso.`);
      setShowTestDataDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível gerar os dados de teste.");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium uppercase tracking-[0.18em] text-primary">Administração</p>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="mt-1 text-muted-foreground">Ajustes operacionais e ferramentas de validação do sistema.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <TestTube2 className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">Dados de teste</h2>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">Fictícios</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Gere rapidamente produtos, clientes de teste, um cardápio aberto, uma sessão de caixa e pedidos com PIX, cartão e dinheiro para validar o PDV e os relatórios.
                </p>
                <Button
                  className="mt-5 gap-2 bg-amber-600 text-white hover:bg-amber-700"
                  onClick={() => setShowTestDataDialog(true)}
                  disabled={generateTestDataMutation.isPending}
                >
                  <DatabaseZap className="h-4 w-4" />
                  Gerar dados de teste
                </Button>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-amber-200/80 bg-white/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-black/10 dark:text-amber-100">
              <strong>Importante:</strong> a ação não apaga nem substitui dados existentes. Cada execução cria um novo lote identificável de dados fictícios.
            </div>
          </Card>

          <Card className="p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-foreground">Acesso protegido</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                A geração de dados exige uma sessão autenticada com permissão administrativa. Os registros criados entram no mesmo fluxo de estoque, caixa, vendas e relatórios.
              </p>
            </div>
          </Card>
        </div>

        {/* Impressora Térmica Configuration Card */}
        <div className="mt-6 space-y-6">
          <Card className="p-6 shadow-sm border-border bg-card">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Printer className="h-7 w-7" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Impressora Térmica Padrão</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure a impressora ESC/POS (Bluetooth ou USB) para emissão de cupons de vendas.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">
                      Identificação da Impressora
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={printerName}
                        onChange={(e) => setPrinterName(e.target.value)}
                        placeholder="Ex: Impressora Bluetooth POS-58"
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const device = await (navigator as any).bluetooth?.requestDevice({ acceptAllDevices: true });
                            if (device?.name) {
                              setPrinterName(device.name);
                              toast.success(`Impressora "${device.name}" selecionada com sucesso!`);
                            }
                          } catch (e: any) {
                            toast.error("Seleção Bluetooth cancelada ou indisponível.");
                          }
                        }}
                      >
                        Buscar Dispositivo
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-foreground text-sm">Impressão Automática</p>
                      <p className="text-xs text-muted-foreground">Imprimir cupom térmico logo após finalizar a venda</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPrint}
                      onChange={(e) => setAutoPrint(e.target.checked)}
                      className="w-5 h-5 accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Cabeçalho do Cupom</label>
                    <textarea
                      value={customHeader}
                      onChange={(e) => setCustomHeader(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Rodapé do Cupom</label>
                    <textarea
                      value={customFooter}
                      onChange={(e) => setCustomFooter(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleSavePrinter}
                    className="bg-primary hover:bg-primary/90 text-white font-medium gap-2"
                  >
                    Salvar Configuração de Impressão
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await testPrinterCutAndPrint("bluetooth");
                        toast.success("🖨️ Teste de impressão e corte Bluetooth executado com sucesso!");
                      } catch (e: any) {
                        toast.error(e?.message || "Falha no teste Bluetooth.");
                      }
                    }}
                    className="gap-2"
                  >
                    Testar Corte (Bluetooth)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await testPrinterCutAndPrint("serial");
                        toast.success("🔌 Teste de impressão e corte USB Serial executado com sucesso!");
                      } catch (e: any) {
                        toast.error(e?.message || "Falha no teste USB Serial.");
                      }
                    }}
                    className="gap-2"
                  >
                    Testar Corte (USB Serial)
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Histórico de Impressões Térmicas */}
          <Card className="p-6 shadow-sm border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Histórico de Impressões Térmicas</h2>
                <p className="text-sm text-muted-foreground">Auditoria de cupons emitidos e opção de reimpressão.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshHistory}>
                  Atualizar
                </Button>
                {printHistory.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      clearPrintHistory();
                      refreshHistory();
                      toast.success("Histórico de impressão limpo com sucesso.");
                    }}
                  >
                    Limpar Histórico
                  </Button>
                )}
              </div>
            </div>

            {printHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
                Nenhum cupom impresso recentemente.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {printHistory.map((entry) => (
                  <div key={entry.id} className="p-3 border border-border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-muted/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Pedido #{entry.orderId}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${entry.status === "Sucesso" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-250"}`}>
                          {entry.status}
                        </span>
                        <span className="text-xs text-muted-foreground">({entry.method})</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cliente: <strong>{entry.customerName}</strong> · Total: <strong>R$ {entry.total.toFixed(2)}</strong> · {new Date(entry.timestamp).toLocaleString("pt-BR")}
                      </p>
                      {entry.error && (
                        <p className="text-xs text-red-500 mt-0.5">Erro: {entry.error}</p>
                      )}
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            if (entry.method === "Bluetooth") {
                              await printViaWebBluetooth(entry.data);
                            } else {
                              await printViaWebSerial(entry.data);
                            }
                            toast.success(`🖨️ Cupom do pedido #${entry.orderId} reimpresso com sucesso!`);
                            refreshHistory();
                          } catch (e: any) {
                            toast.error(e?.message || "Falha na reimpressão do cupom.");
                            refreshHistory();
                          }
                        }}
                        className="w-full md:w-auto gap-1"
                      >
                        🖨️ Reenviar (Mesmo Canal)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>


      </div>

      <Dialog open={showTestDataDialog} onOpenChange={(open) => !generateTestDataMutation.isPending && setShowTestDataDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar dados fictícios?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Serão criados produtos, clientes, cardápio, caixa e cinco pedidos de teste. Nada será apagado ou sobrescrito.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowTestDataDialog(false)} disabled={generateTestDataMutation.isPending}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700 gap-2"
              onClick={() => generateTestDataMutation.mutate()}
              disabled={generateTestDataMutation.isPending}
            >
              {generateTestDataMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar e Gerar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
