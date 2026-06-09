import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number | null;
  isUnlimited: boolean;
  isAvailable: boolean;
}

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", quantity: "", isUnlimited: false });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Queries e mutations
  const { data: productsData, isLoading } = trpc.pdv.products.list.useQuery();
  const createProductMutation = trpc.pdv.products.create.useMutation();
  const updateProductMutation = trpc.pdv.products.update.useMutation();

  useEffect(() => {
    if (productsData) {
      setProducts(productsData.map(p => ({
        id: p.id,
        name: p.name,
        price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        quantity: p.quantity,
        isUnlimited: p.isUnlimited,
        isAvailable: p.isAvailable,
      })));
    }
  }, [productsData]);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await createProductMutation.mutateAsync({
        name: formData.name,
        price: parseFloat(formData.price),
        quantity: formData.isUnlimited ? null : parseInt(formData.quantity) || 0,
        isUnlimited: formData.isUnlimited,
      });

      toast.success(editingId ? "Produto atualizado!" : "Produto criado!");
      setFormData({ name: "", price: "", quantity: "", isUnlimited: false });
      setEditingId(null);
      setShowDialog(false);
    } catch (error) {
      toast.error("Erro ao salvar produto");
    }
  };

  const handleEditProduct = (product: Product) => {
    setFormData({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity?.toString() || "",
      isUnlimited: product.isUnlimited,
    });
    setEditingId(product.id);
    setShowDialog(true);
  };

  const handleToggleAvailability = async (id: number, isAvailable: boolean) => {
    try {
      await updateProductMutation.mutateAsync({
        id,
        isAvailable: !isAvailable,
      });
      toast.success("Disponibilidade atualizada!");
    } catch (error) {
      toast.error("Erro ao atualizar disponibilidade");
    }
  };

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    try {
      await updateProductMutation.mutateAsync({
        id,
        quantity: Math.max(0, quantity),
      });
    } catch (error) {
      toast.error("Erro ao atualizar quantidade");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/60">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cardapio e Produtos</h1>
            <p className="text-muted-foreground">Gerenciar produtos e estoque</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setFormData({ name: "", price: "", quantity: "", isUnlimited: false });
                setEditingId(null);
                setShowDialog(true);
              }}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Adicionar Produto
            </Button>
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Produto</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Preco</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Quantidade</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground">{product.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-foreground">R$ {product.price.toFixed(2)}</p>
                    </td>
                    <td className="py-3 px-4">
                      {product.isUnlimited ? (
                        <span className="text-muted-foreground">Ilimitado</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleUpdateQuantity(product.id, (product.quantity || 0) - 1)}
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm">{product.quantity}</span>
                          <Button
                            onClick={() => handleUpdateQuantity(product.id, (product.quantity || 0) + 1)}
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            +
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                        variant={product.isAvailable ? "default" : "destructive"}
                        size="sm"
                      >
                        {product.isAvailable ? "Disponivel" : "Indisponivel"}
                      </Button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditProduct(product)}
                          variant="outline"
                          size="sm"
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add/Edit Product Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Produto" : "Adicionar Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nome do Produto</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Hamburger"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Preco (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="25.00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.isUnlimited}
                    onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
                  />
                  Quantidade Ilimitada
                </label>
              </div>
              {!formData.isUnlimited && (
                <div>
                  <label className="text-sm font-medium text-foreground">Quantidade</label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="10"
                    className="mt-1"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleAddProduct}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
                </Button>
                <Button
                  onClick={() => setShowDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
