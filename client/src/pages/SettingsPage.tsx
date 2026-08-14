import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, DatabaseZap, Loader2, ShieldCheck, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface GeneratedSnapshot {
  products: Array<{ id: number; name: string; price: number; quantity: number; isUnlimited: boolean; isAvailable: boolean }>;
  customers: Array<{ id: number; name: string; phone: string | null; email: string | null; isDefault: boolean; isActive: boolean; createdAt: Date | string }>;
  responsible: { id: number; name: string; cpf: string; phone: string };
  weeklyMenus: Array<{
    id: number;
    saturdayDate: string;
    saturdayOrder: number;
    responsibleId: number;
    responsibleName: string;
    status: "open" | "closed";
    items: Array<{ id: string; productName: string; price: number; quantity: number | null; isUnlimited: boolean; isAvailable: boolean }>;
  }>;
  cashierSessions: Array<{
    id: number;
    legacyId: string;
    weeklyMenuId: number;
    responsibleId: number;
    openedAt: string;
    closedAt: string | null;
    orders: Array<{
      id: number;
      legacyId: string;
      paymentMethod: "pix" | "card" | "cash";
      total: number;
      status: "completed";
      customerId: number;
      customerName: string;
      createdAt: string;
      items: Array<{ productId: number; productName: string; quantity: number; price: number; unitPrice: number; subtotal: number }>;
    }>;
  }>;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function mergeByKey<T>(current: T[], incoming: T[], key: (item: T) => string): T[] {
  const merged = [...current];
  const keys = new Set(current.map(key));
  for (const item of incoming) {
    const itemKey = key(item);
    if (!keys.has(itemKey)) {
      merged.push(item);
      keys.add(itemKey);
    }
  }
  return merged;
}

function hydrateLegacyStorage(snapshot: GeneratedSnapshot) {
  const customers = mergeByKey(
    readJson<any[]>("customers", []),
    snapshot.customers.map((customer) => ({ ...customer, createdAt: new Date(customer.createdAt) })),
    (customer) => customer.isDefault || String(customer.name).trim().toUpperCase() === "GERAL" ? "GERAL" : String(customer.id),
  );
  localStorage.setItem("customers", JSON.stringify(customers));

  const responsibles = mergeByKey(
    readJson<any[]>("cashierResponsibles", []),
    [snapshot.responsible],
    (responsible) => String(responsible.id),
  );
  localStorage.setItem("cashierResponsibles", JSON.stringify(responsibles));

  const menus = mergeByKey(
    readJson<any[]>("weeklyMenus", []),
    snapshot.weeklyMenus,
    (menu) => String(menu.id),
  );
  localStorage.setItem("weeklyMenus", JSON.stringify(menus));

  const sessions = mergeByKey(
    readJson<any[]>("cashierSessions", []),
    snapshot.cashierSessions,
    (session) => session.legacyId ? String(session.legacyId) : String(session.id),
  );
  localStorage.setItem("cashierSessions", JSON.stringify(sessions));
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [showTestDataDialog, setShowTestDataDialog] = useState(false);
  const utils = trpc.useUtils();
  const generateTestDataMutation = trpc.settings.generateTestData.useMutation({
    onSuccess: async (result) => {
      hydrateLegacyStorage(result.snapshot);
      await Promise.all([
        utils.pdv.products.list.invalidate(),
        utils.pdv.customers.list.invalidate(),
        utils.pdv.customers.getDefault.invalidate(),
        utils.pdv.menu.getByDate.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
        utils.pdv.orders.getBySession.invalidate(),
        utils.pdv.cashier.getOpenSession.invalidate(),
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

          <Card className="p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-foreground">Acesso protegido</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              A geração de dados exige uma sessão autenticada com permissão administrativa. Os registros criados entram no mesmo fluxo de estoque, caixa, vendas e relatórios.
            </p>
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
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
              <p className="font-semibold">O lote inclui:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>6 produtos fictícios com estoque</li>
                <li>3 clientes fictícios e o cliente GERAL</li>
                <li>1 cardápio aberto e 1 sessão de caixa fechada</li>
                <li>5 pedidos concluídos com pagamentos variados</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTestDataDialog(false)} disabled={generateTestDataMutation.isPending}>Cancelar</Button>
              <Button onClick={() => generateTestDataMutation.mutate()} disabled={generateTestDataMutation.isPending} className="gap-2">
                {generateTestDataMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {generateTestDataMutation.isPending ? "Gerando..." : "Confirmar geração"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
