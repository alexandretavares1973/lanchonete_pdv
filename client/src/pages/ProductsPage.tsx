import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Save, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLowStockMessage, isLowGlobalStock } from "@shared/stockAlerts";
import { parseStockQuantity } from "@shared/stockQuantity";

function QuickStockEditor({
  productId,
  productName,
  quantity,
}: {
  productId: number;
  productName: string;
  quantity: number | null;
}) {
  const [draftQuantity, setDraftQuantity] = useState(String(quantity ?? 0));
  const utils = trpc.useUtils();
  const updateProduct = trpc.pdv.products.update.useMutation({
    onSuccess: async () => {
      await utils.pdv.products.list.invalidate();
      toast.success(`Estoque de ${productName} atualizado.`);
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível atualizar o estoque.");
    },
  });

  useEffect(() => {
    setDraftQuantity(String(quantity ?? 0));
  }, [quantity]);

  const saveQuantity = () => {
    const nextQuantity = parseStockQuantity(draftQuantity);
    if (nextQuantity === null) {
      toast.error("Informe uma quantidade inteira igual ou maior que zero.");
      return;
    }
    if (nextQuantity === Number(quantity ?? 0)) return;
    updateProduct.mutate({ id: productId, quantity: nextQuantity });
  };

  return (
    <div className="mt-4 flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor={`stock-${productId}`} className="text-xs font-medium text-muted-foreground">
          Editar estoque rapidamente
        </label>
        <Input
          id={`stock-${productId}`}
          type="number"
          min="0"
          step="1"
          value={draftQuantity}
          onChange={(event) => setDraftQuantity(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") saveQuantity();
          }}
          aria-label={`Quantidade em estoque de ${productName}`}
          className="mt-1 h-9"
          disabled={updateProduct.isPending}
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={saveQuantity}
        disabled={updateProduct.isPending || draftQuantity === String(quantity ?? 0)}
        className="h-9 gap-1"
      >
        <Save className="h-3.5 w-3.5" />
        {updateProduct.isPending ? "Salvando" : "Salvar"}
      </Button>
    </div>
  );
}

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const { data: products = [], isLoading, error } = trpc.pdv.products.list.useQuery();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground">Estoque global cadastrado no banco de dados</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando produtos...</Card>}
        {error && <Card className="p-8 text-center text-destructive">Não foi possível carregar os produtos.</Card>}
        {!isLoading && !error && products.length === 0 && (
          <Card className="p-10 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">Nenhum produto cadastrado</p>
          </Card>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => {
              const lowStock = isLowGlobalStock(product);
              return (
                <Card key={product.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-foreground truncate">{product.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">R$ {Number(product.price).toFixed(2)}</p>
                    </div>
                    <Badge variant={product.isAvailable ? "default" : "outline"}>
                      {product.isAvailable ? "Disponível" : "Indisponível"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estoque global</span>
                    <span className="font-bold text-foreground">
                      {product.quantity ?? 0} unidade(s)
                    </span>
                  </div>

                  <QuickStockEditor
                    productId={product.id}
                    productName={product.name}
                    quantity={product.quantity}
                  />

                  {lowStock && (
                    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900" role="alert">
                      <div className="flex items-start gap-2">
                        <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{getLowStockMessage(product.name)}</span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
