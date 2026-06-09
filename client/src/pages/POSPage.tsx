import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export default function POSPage() {
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("cash");
  const [searchTerm, setSearchTerm] = useState("");

  const handleAddToCart = (id: number, name: string, price: number) => {
    const existingItem = cart.find(item => item.id === id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price
            }
          : item
      ));
    } else {
      setCart([...cart, {
        id,
        name,
        price,
        quantity: 1,
        subtotal: price
      }]);
    }
  };

  const handleRemoveFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(id);
    } else {
      setCart(cart.map(item =>
        item.id === id
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.price
            }
          : item
      ));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ponto de Venda</h1>
            <p className="text-muted-foreground">Gerenciar vendas e pedidos</p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
          >
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <Card className="p-4">
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Placeholder Products */}
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card
                  key={item}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleAddToCart(item, `Produto ${item}`, 15.00 + item)}
                >
                  <div className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-3xl">🍔</span>
                  </div>
                  <h3 className="font-semibold text-foreground">Produto {item}</h3>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-lg font-bold text-primary mt-2">R$ {(15.00 + item).toFixed(2)}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Carrinho</h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          -
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          +
                        </Button>
                        <Button
                          onClick={() => handleRemoveFromCart(item.id)}
                          variant="destructive"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium text-foreground">R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-foreground">Forma de Pagamento</p>
                <div className="space-y-2">
                  {["cash", "card", "pix"].map((method) => (
                    <Button
                      key={method}
                      onClick={() => setPaymentMethod(method as any)}
                      variant={paymentMethod === method ? "default" : "outline"}
                      className="w-full justify-start"
                    >
                      {method === "cash" && "💵 Dinheiro"}
                      {method === "card" && "💳 Cartão"}
                      {method === "pix" && "📱 PIX"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <Button
                  disabled={cart.length === 0}
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                >
                  Finalizar Pedido
                </Button>
                <Button
                  onClick={() => setCart([])}
                  variant="outline"
                  className="w-full"
                >
                  Limpar Carrinho
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
