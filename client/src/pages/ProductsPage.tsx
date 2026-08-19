import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Plus, Save, Trash2, TriangleAlert, Edit2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLowStockMessage, isLowGlobalStock } from "@shared/stockAlerts";
import { parseStockQuantity } from "@shared/stockQuantity";

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: products = [], isLoading, error } = trpc.pdv.products.list.useQuery();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form states for Create/Edit
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const createMutation = trpc.pdv.products.create.useMutation({
    onSuccess: async () => {
      await utils.pdv.products.list.invalidate();
      toast.success("✅ Produto cadastrado com sucesso!");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar produto.");
    },
  });

  const updateMutation = trpc.pdv.products.update.useMutation({
    onSuccess: async () => {
      await utils.pdv.products.list.invalidate();
      toast.success("✅ Produto atualizado com sucesso!");
      setShowEditDialog(false);
      setSelectedProduct(null);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar produto.");
    },
  });

  const deleteMutation = trpc.pdv.products.delete.useMutation({
    onSuccess: async () => {
      await utils.pdv.products.list.invalidate();
      toast.success("✅ Produto excluído definitivamente.");
      setShowDeleteDialog(false);
      setSelectedProduct(null);
    },
    onError: (err) => {
      toast.error(err.message || "Não foi possível excluir o produto. Tente desativá-lo.");
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormPrice("");
    setFormQuantity("");
    setFormDescription("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (product: any) => {
    setSelectedProduct(product);
    setFormName(product.name);
    setFormPrice(String(product.price));
    setFormQuantity(String(product.quantity ?? 0));
    setFormDescription(product.description || "");
    setShowEditDialog(true);
  };

  const handleOpenDelete = (product: any) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleToggleAvailability = (product: any) => {
    const nextAvailability = !product.isAvailable;
    updateMutation.mutate({
      id: product.id,
      isAvailable: nextAvailability,
    });
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    const qtyNum = parseStockQuantity(formQuantity);
    if (qtyNum === null) {
      toast.error("Informe uma quantidade inteira válida (>= 0).");
      return;
    }

    createMutation.mutate({
      name: formName.trim().toUpperCase(),
      price: priceNum,
      quantity: qtyNum,
      description: formDescription.trim() || undefined,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!formName.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    const qtyNum = parseStockQuantity(formQuantity);
    if (qtyNum === null) {
      toast.error("Informe uma quantidade inteira válida (>= 0).");
      return;
    }

    updateMutation.mutate({
      id: selectedProduct.id,
      name: formName.trim().toUpperCase(),
      price: priceNum,
      quantity: qtyNum,
      description: formDescription.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Produtos (Estoque Global)</h1>
            <p className="text-muted-foreground">Cadastre, altere preços, gerencie estoques e desative produtos</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleOpenCreate} className="gap-2 bg-gradient-to-r from-primary to-secondary text-white">
              <Plus className="h-4 w-4" /> Novo Produto
            </Button>
            <Button variant="outline" onClick={() => setLocation("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        </div>

        {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando produtos...</Card>}
        {error && <Card className="p-8 text-center text-destructive">Não foi possível carregar os produtos.</Card>}
        {!isLoading && !error && products.length === 0 && (
          <Card className="p-10 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">Nenhum produto cadastrado</p>
            <Button onClick={handleOpenCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Cadastrar primeiro produto
            </Button>
          </Card>
        )}

        {!isLoading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((product) => {
              const lowStock = isLowGlobalStock(product);
              return (
                <Card key={product.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground truncate">{product.name}</h2>
                        <p className="text-sm text-muted-foreground mt-1">R$ {Number(product.price).toFixed(2)}</p>
                      </div>
                      <Badge variant={product.isAvailable ? "default" : "destructive"}>
                        {product.isAvailable ? "Disponível" : "Desativado"}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estoque global</span>
                      <span className="font-bold text-foreground">
                        {product.quantity ?? 0} unidade(s)
                      </span>
                    </div>

                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {product.description}
                      </p>
                    )}

                    {lowStock && (
                      <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900" role="alert">
                        <div className="flex items-start gap-2">
                          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{getLowStockMessage(product.name)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAvailability(product)}
                      className="gap-1 text-xs"
                    >
                      {product.isAvailable ? (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-destructive" /> Desativar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Reativar
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(product)}
                        className="gap-1 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(product)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        title="Excluir produto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog Criar Produto */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Produto (Estoque Global)</DialogTitle>
              <DialogDescription>
                Cadastre um novo item no sistema. Ele ficará disponível para ser adicionado aos cardápios semanais.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveCreate} className="space-y-4 py-2">
              <div>
                <Label htmlFor="create-name">Nome do Produto</Label>
                <Input
                  id="create-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: HAMBÚRGUER"
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-price">Preço (R$)</Label>
                  <Input
                    id="create-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="create-qty">Quantidade Inicial</Label>
                  <Input
                    id="create-qty"
                    type="number"
                    step="1"
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="10"
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="create-desc">Descrição (Opcional)</Label>
                <Input
                  id="create-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Pão, carne e queijo"
                  className="mt-1"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Cadastrando..." : "Cadastrar Produto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Produto */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
              <DialogDescription>
                Atualize as informações, o preço ou reposição de estoque do produto.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-name">Nome do Produto</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Preço (R$)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-qty">Quantidade em Estoque</Label>
                  <Input
                    id="edit-qty"
                    type="number"
                    step="1"
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-desc">Descrição (Opcional)</Label>
                <Input
                  id="edit-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Excluir / Desativar Produto */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir ou Desativar Produto</DialogTitle>
              <DialogDescription>
                Se este produto já foi utilizado em cardápios ou vendas antigas, o sistema bloqueará a exclusão definitiva para preservar o histórico e relatórios. Nesse caso, a recomendação é <strong>desativá-lo</strong>.
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="py-2 text-sm space-y-2">
                <p>Produto selecionado: <strong className="text-foreground">{selectedProduct.name}</strong></p>
                <p className="text-muted-foreground text-xs">
                  Deseja tentar a exclusão definitiva ou prefere apenas desativar o produto para que ele não apareça em novos cardápios?
                </p>
              </div>
            )}
            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedProduct) {
                    handleToggleAvailability(selectedProduct);
                    setShowDeleteDialog(false);
                  }
                }}
              >
                Apenas Desativar
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (selectedProduct) {
                      deleteMutation.mutate({ id: selectedProduct.id });
                    }
                  }}
                >
                  {deleteMutation.isPending ? "Excluindo..." : "Excluir Definitivamente"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
