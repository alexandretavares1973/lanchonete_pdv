import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Filter, Link2, Loader2, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { filterAndSortHistoricalSessions, type HistoricalSessionFilterOrder } from "../../../shared/historicalSessionFilters";
import { trpc } from "@/lib/trpc";

type HistoricalItem = {
  productId: number;
  productName: string;
  quantity: number;
  refundedQuantity?: number | null;
};

type HistoricalSession = {
  id: number;
  responsibleId: number;
  openedAt: Date | string;
  closedAt: Date | string | null;
  status: "open" | "closed";
  weeklyMenuId: number | null;
  orders: Array<{ id: number; total: number; status: string; items: HistoricalItem[] }>;
};

type Menu = {
  id: number;
  saturdayDate: Date | string;
  saturdayOrder: number;
  status: "open" | "closed";
  items: Array<{ productId: number; productName: string; quantity: number | null }>;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function menuLabel(menu: Menu) {
  const ordinal = ["1º", "2º", "3º", "4º", "5º"][menu.saturdayOrder - 1] || String(menu.saturdayOrder);
  return `${ordinal} sábado — ${new Date(menu.saturdayDate).toLocaleDateString("pt-BR")}`;
}

export default function HistoricalSessionReviewPage() {
  const [, setLocation] = useLocation();
  const { data: rawSessions = [], isLoading } = trpc.pdv.cashier.getUnlinkedSessionsForReview.useQuery();
  const { data: rawMenus = [] } = trpc.pdv.menu.list.useQuery();
  const sessions = rawSessions as HistoricalSession[];
  const menus = rawMenus as Menu[];
  const utils = trpc.useUtils();
  const [selectedMenuBySession, setSelectedMenuBySession] = useState<Record<number, string>>({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<HistoricalSessionFilterOrder>("openedAtDesc");
  const linkMutation = trpc.pdv.cashier.linkHistoricalSession.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.pdv.cashier.getUnlinkedSessionsForReview.invalidate(),
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
      ]);
      toast.success("Sessão vinculada ao cardápio com sucesso.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível vincular a sessão."),
  });

  const visibleSessions = useMemo(
    () => filterAndSortHistoricalSessions(sessions, { startDate, endDate, sortBy }),
    [sessions, startDate, endDate, sortBy],
  );

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSortBy("openedAtDesc");
  };

  const menuProductIds = useMemo(
    () => new Map(menus.map((menu) => [menu.id, new Set(menu.items.map((item) => item.productId))])),
    [menus],
  );

  const getSuggestedMenu = (session: HistoricalSession) => {
    const productIds = new Set(session.orders.flatMap((order) => order.items.map((item) => item.productId)));
    if (productIds.size === 0) return undefined;
    const matches = menus.filter((menu) => {
      const ids = menuProductIds.get(menu.id);
      return ids && Array.from(productIds).every((productId) => ids.has(productId));
    });
    return matches.length === 1 ? matches[0] : undefined;
  };

  const selectMenu = (session: HistoricalSession, value: string) => {
    setSelectedMenuBySession((current) => ({ ...current, [session.id]: value }));
  };

  const linkSession = (session: HistoricalSession) => {
    const menuId = Number(selectedMenuBySession[session.id]);
    if (!Number.isInteger(menuId) || menuId <= 0) {
      toast.error("Selecione o cardápio correto antes de confirmar.");
      return;
    }
    const menu = menus.find((candidate) => candidate.id === menuId);
    const confirmed = window.confirm(
      `Confirmar vínculo da sessão #${session.id} ao ${menu ? menuLabel(menu) : "cardápio selecionado"}?\n\nEssa alteração muda quais vendas entram nos relatórios.`,
    );
    if (!confirmed) return;
    linkMutation.mutate({ sessionId: session.id, weeklyMenuId: menuId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-medium uppercase tracking-[0.18em] text-primary">Administração de dados</p>
            <h1 className="text-3xl font-bold text-foreground">Revisar sessões históricas</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">Revise os pedidos antigos e escolha manualmente o cardápio correto. Nenhum vínculo é feito automaticamente quando houver dúvida.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        <Card className="mb-6 border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm leading-6">
              <p className="font-semibold">A revisão é permanente e afeta os relatórios.</p>
              <p>Confira os produtos e quantidades de cada sessão antes de confirmar. Sessões sem pedidos também podem ser vinculadas, mas normalmente não alteram os totais.</p>
            </div>
          </div>
        </Card>

        <Card className="mb-6 p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Filtrar sessões</h2>
                <p className="text-xs text-muted-foreground">Use o período de abertura para localizar registros antigos.</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="gap-2" disabled={!startDate && !endDate && sortBy === "openedAtDesc"}>
              <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
            <label className="text-sm font-medium text-foreground" htmlFor="historical-start-date">Data inicial<Input id="historical-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1" /></label>
            <label className="text-sm font-medium text-foreground" htmlFor="historical-end-date">Data final<Input id="historical-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1" /></label>
            <label className="text-sm font-medium text-foreground" htmlFor="historical-sort">Ordenar por<select id="historical-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as HistoricalSessionFilterOrder)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="openedAtDesc">Data mais recente primeiro</option><option value="openedAtAsc">Data mais antiga primeiro</option><option value="ordersDesc">Maior quantidade de pedidos</option><option value="totalDesc">Maior valor total</option></select></label>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground"><strong className="text-foreground">{visibleSessions.length}</strong> de {sessions.length} sessão(ões)</div>
          </div>
          {startDate && endDate && startDate > endDate && <p className="mt-2 text-sm text-destructive">A data inicial deve ser anterior ou igual à data final.</p>}
        </Card>

        {isLoading ? (
          <Card className="p-10 text-center text-muted-foreground">Carregando sessões históricas...</Card>
        ) : sessions.length === 0 ? (
          <Card className="p-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
            <p className="font-semibold text-foreground">Não há sessões históricas pendentes.</p>
            <p className="mt-1 text-sm text-muted-foreground">Todas as sessões já estão vinculadas ou não existem registros para revisar.</p>
          </Card>
        ) : visibleSessions.length === 0 ? (
          <Card className="p-10 text-center">
            <Filter className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold text-foreground">Nenhuma sessão corresponde aos filtros.</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste o período ou a ordenação para ampliar a busca.</p>
            <Button type="button" variant="outline" onClick={resetFilters} className="mt-4">Limpar filtros</Button>
          </Card>
        ) : (
          <div className="space-y-5">
            {visibleSessions.map((session) => {
              const suggestedMenu = getSuggestedMenu(session);
              const selectedMenuId = selectedMenuBySession[session.id] || (suggestedMenu ? String(suggestedMenu.id) : "");
              const productSummary = new Map<string, number>();
              session.orders.forEach((order) => order.items.forEach((item) => productSummary.set(item.productName, (productSummary.get(item.productName) || 0) + item.quantity)));
              const total = session.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

              return (
                <Card key={session.id} className="p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-foreground">Sessão #{session.id}</h2>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">Responsável #{session.responsibleId}</span>
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{session.status === "open" ? "Aberta" : "Fechada"}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Abertura: {new Date(session.openedAt).toLocaleString("pt-BR")} · {session.orders.length} pedido(s) · Total bruto: {money(total)}</p>
                    </div>
                    <div className="min-w-[280px]">
                      <label className="mb-1 block text-sm font-medium text-foreground" htmlFor={`menu-${session.id}`}>Cardápio correto</label>
                      <select
                        id={`menu-${session.id}`}
                        value={selectedMenuId}
                        onChange={(event) => selectMenu(session, event.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="">Selecione manualmente</option>
                        {menus.map((menu) => <option key={menu.id} value={menu.id}>{menuLabel(menu)} ({menu.status === "open" ? "aberto" : "fechado"})</option>)}
                      </select>
                      {suggestedMenu && <p className="mt-1 text-xs text-emerald-700">Sugestão baseada nos produtos: {menuLabel(suggestedMenu)}. Confirme antes de salvar.</p>}
                      <Button className="mt-3 w-full gap-2" onClick={() => linkSession(session)} disabled={linkMutation.isPending || !selectedMenuId}>
                        {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                        Confirmar vínculo
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <h3 className="mb-3 font-semibold text-foreground">Produtos encontrados</h3>
                      {productSummary.size === 0 ? <p className="text-sm text-muted-foreground">Nenhum item de pedido nesta sessão.</p> : (
                        <div className="space-y-2">{Array.from(productSummary.entries()).map(([name, quantity]) => <div key={name} className="flex justify-between gap-3 text-sm"><span className="text-foreground">{name}</span><strong className="text-primary">{quantity}x</strong></div>)}</div>
                      )}
                    </div>
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <h3 className="mb-3 font-semibold text-foreground">Pedidos para conferência</h3>
                      {session.orders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido.</p> : (
                        <div className="max-h-40 space-y-2 overflow-y-auto">{session.orders.map((order) => <div key={order.id} className="flex justify-between gap-3 rounded border border-border/60 bg-background p-2 text-sm"><span className="text-foreground">Pedido #{order.id} · {order.status}</span><strong className="text-primary">{money(Number(order.total || 0))}</strong></div>)}</div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
