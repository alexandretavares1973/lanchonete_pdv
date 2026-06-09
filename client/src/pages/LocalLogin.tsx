import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function LocalLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Preencha usuário e senha");
      return;
    }

    setIsLoading(true);

    try {
      // Simular autenticação local
      // Em produção, isso seria uma chamada tRPC
      if (username === "admin" && password === "admin") {
        localStorage.setItem("localAuth", JSON.stringify({ username, timestamp: Date.now() }));
        toast.success("Login realizado com sucesso!");
        setLocation("/dashboard");
      } else {
        toast.error("Usuário ou senha inválidos");
      }
    } catch (error) {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 mb-4">
            <span className="text-2xl font-bold text-white">POS</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Lanchonete PDV</h1>
          <p className="text-muted-foreground mt-2">Sistema de Ponto de Venda</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Usuário
            </label>
            <Input
              type="text"
              placeholder="Digite seu usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Senha
            </label>
            <Input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-2 h-10"
          >
            {isLoading ? "Entrando..." : "Fazer Login"}
          </Button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-muted-foreground mb-2">
            <strong>Credenciais de Demonstração:</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Usuário: <code className="bg-white px-2 py-1 rounded">admin</code>
          </p>
          <p className="text-xs text-muted-foreground">
            Senha: <code className="bg-white px-2 py-1 rounded">admin</code>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Desenvolvido com amor para sua lanchonete
        </p>
      </Card>
    </div>
  );
}
