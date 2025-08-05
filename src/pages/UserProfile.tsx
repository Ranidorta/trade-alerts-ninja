import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Phone, Mail, Edit, Save, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserData {
  email: string;
  displayName: string;
  phone?: string;
  cpf?: string;
  role?: string;
  assinaturaAtiva?: boolean;
}

const UserProfile = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUserData({
        email: user.email || '',
        displayName: user.user_metadata?.display_name || user.email || '',
        phone: user.user_metadata?.phone || '',
        cpf: user.user_metadata?.cpf || '',
        role: 'user',
        assinaturaAtiva: true
      });
      setIsLoading(false);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSaveProfile = async () => {
    if (!user || !userData) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: userData.displayName,
          phone: userData.phone,
          cpf: userData.cpf
        }
      });

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar seu perfil.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setUserData({
        email: user.email || '',
        displayName: user.user_metadata?.display_name || user.email || '',
        phone: user.user_metadata?.phone || '',
        cpf: user.user_metadata?.cpf || '',
        role: 'user',
        assinaturaAtiva: true
      });
    }
    setIsEditing(false);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p>Você precisa estar logado para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <User className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Edit size={18} />
            Editar Dados
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button 
              onClick={handleCancelEdit} 
              variant="outline"
              className="flex items-center gap-2"
              disabled={isSaving}
            >
              <X size={18} />
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfile} 
              className="flex items-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Dados Pessoais</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome</Label>
                  {isEditing ? (
                    <Input 
                      id="displayName"
                      name="displayName"
                      value={userData.displayName}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-lg py-2">{userData.displayName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2 py-2">
                    <Mail size={18} className="text-muted-foreground" />
                    <p className="text-lg">{userData.email}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  {isEditing ? (
                    <Input 
                      id="phone"
                      name="phone"
                      value={userData.phone || ""}
                      onChange={handleInputChange}
                      placeholder="(XX) XXXXX-XXXX"
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-2">
                      <Phone size={18} className="text-muted-foreground" />
                      <p className="text-lg">{userData.phone || "Não informado"}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  {isEditing ? (
                    <Input 
                      id="cpf"
                      name="cpf"
                      value={userData.cpf || ""}
                      onChange={handleInputChange}
                      placeholder="XXX.XXX.XXX-XX"
                    />
                  ) : (
                    <p className="text-lg py-2">{userData.cpf || "Não informado"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h2 className="text-xl font-semibold mb-4">Dados da Assinatura</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Plano</h4>
                <p className="text-lg">
                  {userData.role === 'admin' ? "Admin" : userData.assinaturaAtiva ? "Premium" : "Básico"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <p className="text-lg">
                  {userData.assinaturaAtiva ? 
                    <span className="text-green-600">Ativa</span> : 
                    <span className="text-yellow-600">Inativa</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;