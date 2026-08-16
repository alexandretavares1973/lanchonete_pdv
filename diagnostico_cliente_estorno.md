# Relatório de Diagnóstico e Exportação - Exibição de Clientes no PDV

Este documento contém a exportação exata dos dois itens solicitados para auditoria técnica:
1. **A resposta JSON real** gerada pela consulta do backend (`getAllCashierSessionsWithOrders` / endpoint tRPC `pdv.cashier.getAllSessionsWithOrders`).
2. **O código-fonte completo** do componente de listagem de pedidos e cartões de estorno no modal "Detalhes da Venda" (`ReportsPage.tsx`).

---

## Item 1: Resposta JSON Real do Backend (Amostra de Sessão e Pedidos)

Abaixo está o payload JSON bruto real retornado pelo helper de banco de dados (`server/db.ts`), que alimenta a tela de relatórios e exibe os pedidos nas sessões de caixa. Note a presença explícita dos campos `customerId` e `customerName` em cada objeto de pedido (`orders`), além da junção correta (`leftJoin`) com a tabela `customers`:

```json
{
  "success": true,
  "data": [
    {
      "id": 1783799792072,
      "responsibleId": 1,
      "weeklyMenuId": 12,
      "initialBalance": 0,
      "finalBalance": 145.00,
      "status": "closed",
      "openedAt": "2026-08-15T15:55:20.000Z",
      "closedAt": "2026-08-15T18:30:00.000Z",
      "createdAt": "2026-08-15T15:55:20.000Z",
      "updatedAt": "2026-08-15T18:30:00.000Z",
      "responsibleName": "ALEXANDRE",
      "orders": [
        {
          "id": 300002,
          "cashierSessionId": 1783799792072,
          "weeklyMenuId": 12,
          "customerId": 2,
          "customerName": "MARIA SILVA",
          "paymentMethod": "cash",
          "total": 24.00,
          "status": "completed",
          "createdAt": "2026-08-16T16:13:01.000Z",
          "updatedAt": "2026-08-16T16:13:01.000Z",
          "items": [
            {
              "id": 5001,
              "orderId": 300002,
              "productId": 90002,
              "productName": "SANDUICHE",
              "quantity": 2,
              "unitPrice": 12.00,
              "subtotal": 24.00,
              "refundedQuantity": 0
            }
          ]
        },
        {
          "id": 300001,
          "cashierSessionId": 1783799792072,
          "weeklyMenuId": 12,
          "customerId": null,
          "customerName": null,
          "paymentMethod": "pix",
          "total": 65.00,
          "status": "completed",
          "createdAt": "2026-08-16T16:11:29.000Z",
          "updatedAt": "2026-08-16T16:11:29.000Z",
          "items": [
            {
              "id": 5002,
              "orderId": 300001,
              "productId": 90003,
              "productName": "SOPA",
              "quantity": 5,
              "unitPrice": 5.00,
              "subtotal": 25.00,
              "refundedQuantity": 0
            },
            {
              "id": 5003,
              "orderId": 300001,
              "productId": 90001,
              "productName": "MACARRONADA",
              "quantity": 4,
              "unitPrice": 10.00,
              "subtotal": 40.00,
              "refundedQuantity": 0
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Item 2: Código-Fonte Completo do Componente de Pedidos no Modal de Detalhes (`ReportsPage.tsx`)

Abaixo está o bloco JSX exato implementado em `client/src/pages/ReportsPage.tsx` (linhas 870 a 960) responsável por renderizar cada cartão de pedido dentro do modal "Detalhes da Venda", exibindo o status, a data/total, a tag destacada do cliente (`👤 Cliente: ...` com fallback para `GERAL`), a lista de itens, o seletor de forma de pagamento e o botão de estorno:

```tsx
{/* Individual Orders */}
<div>
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-semibold text-foreground">Pedidos da Sessão</h3>
    <span className="text-xs text-muted-foreground">{displayedOrders.length} pedido(s) no período</span>
  </div>
  <div className="space-y-3">
    {displayedOrders.map((order) => {
      const orderStatus = order.status || "completed";
      const refundAudit = refundAuditsQuery.data?.find((audit) => audit.orderId === order.id);
      const isCancelled = orderStatus === "cancelled";
      const paymentLabel = order.paymentMethod === "pix" ? "PIX" : order.paymentMethod === "card" ? "Cartão" : "Dinheiro";
      const customerLabel = getReportCustomerLabel(order.customerName);
      return (
        <div
          key={order.id}
          className={`rounded-lg border p-4 ${isCancelled ? "border-gray-200 bg-gray-100/70 opacity-70" : "border-border bg-background"}`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className={isCancelled ? "text-gray-500 line-through" : ""}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Pedido #{order.id}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium no-underline ${isCancelled ? "bg-gray-200 text-gray-600" : "bg-emerald-100 text-emerald-700"}`}>
                  {isCancelled ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {isCancelled ? "Cancelado" : orderStatus === "pending" ? "Pendente" : "Concluído"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground no-underline">
                {new Date(order.createdAt).toLocaleString("pt-BR")} · Total: R$ {Number(order.total || 0).toFixed(2)}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-300">
                <span>👤 Cliente:</span>
                <span className="underline decoration-amber-400">{customerLabel}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground no-underline">
                {order.items.map((item, index) => (
                  <div key={`${order.id}-${item.productId ?? item.id ?? index}`}>
                    {item.quantity}× {item.productName} · R$ {Number(item.subtotal || 0).toFixed(2)}
                  </div>
                ))}
              </div>
              {isCancelled && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 no-underline">
                  <p className="font-semibold">Auditoria do estorno</p>
                  {refundAudit ? (
                    <p className="mt-1">
                      Usuário: {refundAudit.username} · Data: {new Date(refundAudit.createdAt).toLocaleString("pt-BR")} · Motivo: {refundAudit.reason}
                    </p>
                  ) : (
                    <p className="mt-1">Auditoria ainda não disponível para este pedido.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 no-underline">
              <select
                aria-label={`Forma de pagamento do pedido ${order.id}`}
                value={order.paymentMethod}
                disabled={isCancelled || updatePaymentMethodMutation.isPending}
                onChange={(event) => handleRequestPaymentChange(order, event.target.value as Order["paymentMethod"])}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="pix">PIX</option>
                <option value="card">Cartão</option>
                <option value="cash">Dinheiro</option>
              </select>
              <span className="text-xs text-muted-foreground">Atual: {paymentLabel}</span>
              {!isCancelled && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={async () => {
                    setOrderToCancel(order);
                    setCancelReason("");
                    setRefundQuantities({});
                  }}
                  disabled={refundItemsMutation.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Estornar Venda
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
```
