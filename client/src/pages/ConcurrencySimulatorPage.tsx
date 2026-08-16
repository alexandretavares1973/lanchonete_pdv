import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FlaskConical, Loader2, Play, ShieldCheck, Users } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { planDryRun, summarizeSimulationResults, type SimulationOutcome } from "../../../shared/concurrency";

const MAX_SIMULATED_USERS = 20;

type Product = { id: number; name: string; quantity: number | null; isAvailable: boolean | null; price: number | string };
type Menu = { id: number; saturdayDate: Date | string; saturdayOrder: number; status: "open" | "closed"; items: Array<{ productId: number; productName: string; quantity: number | null; isAvailable?: boolean | null }> };
type Session = { id: number; status: "open" | "closed"; weeklyMenuId: number | null; openedAt: Date | string; responsibleId: number };

export default function ConcurrencySimulatorPage() {
  const [, setLocation] = useLocation();
  const { data: rawProducts = [] } = trpc.pdv.products.list.useQuery();
  const { data: rawMenus = [] } = trpc.pdv.menu.list.useQuery();
  const { data: rawSessions = [] } = trpc.pdv.cashier.getAllSessionsWithOrders.useQuery();
  const { data: defaultCustomer } = trpc.pdv.customers.getDefault.useQuery();
  const products = rawProducts as Product[];
  const menus = rawMenus as Menu[];
  const sessions = rawSessions as Session[];
  const utils = trpc.useUtils();
  const [sessionId, setSessionId] = useState("");
  const [menuId, setMenuId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantityPerSale, setQuantityPerSale] = useState("1");
  const [concurrentUsers, setConcurrentUsers] = useState("5");
  const [persistOrders, setPersistOrders] = useState(false);
  const [outcomes, setOutcomes] = useState<SimulationOutcome[]>([]);
  const [running, setRunning] = useState(false);
  const createOrderMutation = trpc.pdv.orders.create.useMutation();

  const openSessions = useMemo(() => sessions.filter((session) => session.status === "open"), [sessions]);
  const selectedSession = openSessions.find((session) => session.id === Number(sessionId));
  const selectedMenu = menus.find((menu) => menu.id === Number(menuId));
  const selectedProduct = products.find((product) => product.id === Number(productId));
  const selectedMenuItem = selectedMenu?.items.find((item) => item.productId === Number(productId));
  const globalQuantity = selectedProduct?.quantity ?? 0;
  const menuQuantity = selectedMenuItem?.quantity ?? null;
  const availableQuantity = menuQuantity === null ? globalQuantity : Math.min(globalQuantity, menuQuantity);
  const requestedQuantity = Math.max(1, Math.floor(Number(quantityPerSale) || 0));
  const userCount = Math.min(MAX_SIMULATED_USERS, Math.max(1, Math.floor(Number(concurrentUsers) || 0)));
  const summary = summarizeSimulationResults(outcomes);

  useEffect(() => {
    if (!sessionId && openSessions[0]) {
      setSessionId(String(openSessions[0].id));
      if (openSessions[0].weeklyMenuId) setMenuId(String(openSessions[0].weeklyMenuId));
    }
  }, [openSessions, sessionId]);

  const setValidatedUserCount = (value: string) => {
    const numeric = Math.min(MAX_SIMULATED_USERS, Math.max(1, Number(value) || 1));
    setConcurrentUsers(String(numeric));
  };

  const validate = () => {
    if (!selectedSession) return "Selecione uma sessão de caixa aberta.";
    if (!selectedProduct) return "Selecione um produto com estoque controlado.";
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) return "Informe uma quantidade positiva por venda.";
    if (selectedMenu && selectedSession.weeklyMenuId && selectedSession.weeklyMenuId !== selectedMenu.id) return "A sessão selecionada pertence a outro cardápio.";
    return undefined;
  };

  const runSimulation = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setRunning(true);
    setOutcomes([]);

    if (!persistOrders) {
      const dryRun = planDryRun(userCount, requestedQuantity, availableQuantity);
      setOutcomes(dryRun);
      setRunning(false);
      toast.success(`Ensaio concluído: ${dryRun.filter((item) => item.status === "accepted").length} venda(s) seriam aceitas.`);
      return;
    }

    if (!defaultCustomer) {
      setRunning(false);
      toast.error("Cadastre ou selecione um cliente padrão antes de persistir a simulação.");
      return;
    }

    const payload = {
      cashierSessionId: selectedSession!.id,
      items: [{ productId: selectedProduct!.id, quantity: requestedQuantity, unitPrice: Number(selectedProduct!.price) }],
      paymentMethod: "pix" as const,
      customerId: defaultCustomer.id,
      ...(selectedMenu ? { weeklyMenuId: selectedMenu.id } : {}),
    };

    const actualOutcomes: SimulationOutcome[] = await Promise.all(
      Array.from({ length: userCount }, (_, index) =>
        createOrderMutation.mutateAsync(payload)
          .then((order) => ({ actor: `Usuário ${index + 1}`, status: "accepted" as const, orderId: order.id, message: "Pedido gravado com estoque reservado atomicamente." }))
          .catch((error) => ({ actor: `Usuário ${index + 1}`, status: "rejected" as const, message: error.message || "Venda rejeitada pelo servidor." })),
      ),
    );
    setOutcomes(actualOutcomes);
    await Promise.all([
      utils.pdv.products.list.invalidate(),
      utils.pdv.menu.getItems.invalidate(),
      utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
    ]);
    setRunning(false);
    const accepted = actualOutcomes.filter((item) => item.status === "accepted").length;
    toast.success(`Simulação persistente concluída: ${accepted} de ${userCount} venda(s) aceitas.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium uppercase tracking-[0.18em] text-primary">Validação operacional</p>
            <h1 className="text-3xl font-bold text-foreground">Simular vendas simultâneas</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">Teste a concorrência usando até {MAX_SIMULATED_USERS} usuários. O modo de ensaio não grava dados; o modo persistente cria pedidos reais e deve ser usado somente em ambiente controlado.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><FlaskConical className="h-5 w-5" /></div><div><h2 className="text-lg font-semibold text-foreground">Parâmetros</h2><p className="text-sm text-muted-foreground">A concorrência usa a mesma mutation do PDV.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-foreground">Sessão aberta<select value={sessionId} onChange={(event) => { setSessionId(event.target.value); const session = openSessions.find((item) => item.id === Number(event.target.value)); if (session?.weeklyMenuId) setMenuId(String(session.weeklyMenuId)); }} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-normal"><option value="">Selecione</option>{openSessions.map((session) => <option key={session.id} value={session.id}>Sessão #{session.id} · responsável #{session.responsibleId}</option>)}</select></label>
              <label className="text-sm font-medium text-foreground">Cardápio opcional<select value={menuId} onChange={(event) => setMenuId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-normal"><option value="">Sem cardápio</option>{menus.filter((menu) => menu.status === "open").map((menu) => <option key={menu.id} value={menu.id}>{new Date(menu.saturdayDate).toLocaleDateString("pt-BR")} · {menu.items.length} itens</option>)}</select></label>
              <label className="text-sm font-medium text-foreground">Produto<select value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-normal"><option value="">Selecione</option>{products.filter((product) => (product.quantity ?? 0) > 0).map((product) => <option key={product.id} value={product.id}>{product.name} · estoque {product.quantity ?? 0}</option>)}</select></label>
              <label className="text-sm font-medium text-foreground">Quantidade por venda<Input type="number" min={1} value={quantityPerSale} onChange={(event) => setQuantityPerSale(event.target.value)} className="mt-1" /></label>
              <label className="text-sm font-medium text-foreground">Usuários concorrentes<Input type="number" min={1} max={MAX_SIMULATED_USERS} value={concurrentUsers} onChange={(event) => setValidatedUserCount(event.target.value)} className="mt-1" /></label>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Saldo considerado</span><strong className="text-foreground">{availableQuantity} unidade(s)</strong></div>
              <div className="mt-1 flex items-center justify-between gap-3"><span className="text-muted-foreground">Máximo teórico de vendas</span><strong className="text-primary">{requestedQuantity > 0 ? Math.floor(availableQuantity / requestedQuantity) : 0}</strong></div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100"><input type="checkbox" checked={persistOrders} onChange={(event) => setPersistOrders(event.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Persistir pedidos no banco</strong><br /><span className="opacity-80">Desmarcado: ensaio seguro. Marcado: cria pedidos reais para validar a concorrência da mutation.</span></span></label>

            <Button onClick={runSimulation} disabled={running} className="mt-5 w-full gap-2">{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{persistOrders ? "Executar simulação persistente" : "Executar ensaio sem gravar"}</Button>
          </Card>

          <Card className="p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-lg font-semibold text-foreground">Resultado</h2><p className="text-sm text-muted-foreground">Cada tentativa aparece individualmente.</p></div></div>
            <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20"><strong className="block text-2xl text-emerald-700">{summary.accepted}</strong><span className="text-xs text-muted-foreground">Aceitas</span></div><div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20"><strong className="block text-2xl text-amber-700">{summary.rejected}</strong><span className="text-xs text-muted-foreground">Rejeitadas</span></div><div className="rounded-lg bg-muted p-3"><strong className="block text-2xl text-foreground">{summary.total}</strong><span className="text-xs text-muted-foreground">Total</span></div></div>
            <div className="mt-5 space-y-2">{outcomes.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 h-5 w-5" />Execute uma simulação para ver os resultados.</div> : outcomes.map((outcome) => <div key={outcome.actor} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm"><div><p className="font-medium text-foreground">{outcome.actor}{outcome.orderId ? ` · pedido #${outcome.orderId}` : ""}</p><p className="text-xs text-muted-foreground">{outcome.message}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${outcome.status === "accepted" ? "bg-emerald-100 text-emerald-700" : outcome.status === "rejected" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{outcome.status === "accepted" ? "aceita" : outcome.status === "rejected" ? "rejeitada" : "erro"}</span></div>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
