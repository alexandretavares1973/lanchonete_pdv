import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, User, Shield, Calendar, Lock } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updatePasswordMutation = trpc.auth.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar senha. Verifique a senha atual.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As novas senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50/30 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Perfil da Conta</h1>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="w-5 h-5 text-amber-600" /> Informações do Usuário
            </CardTitle>
            <CardDescription>Detalhes da conta conectada no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Nome de Usuário
                </span>
                <span className="text-lg font-medium text-gray-900">{user?.name || "Administrador"}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Tipo de Acesso (Função)
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <Shield className="w-3.5 h-3.5" /> {user?.role === "admin" ? "Administrador" : "Operador"}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Método de Autenticação
                </span>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {user?.loginMethod || "Local (Usuário e Senha)"}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Último Acesso
                </span>
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString("pt-BR") : "Agora mesmo"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="w-5 h-5 text-amber-600" /> Alterar Senha
            </CardTitle>
            <CardDescription>Atualize sua senha de acesso ao sistema PDV</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={updatePasswordMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={updatePasswordMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a nova senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={updatePasswordMutation.isPending}
                />
              </div>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all"
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando senha...
                  </>
                ) : (
                  "Salvar Nova Senha"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
