
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const UserProfile = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          setLoading(false);
          return;
        }
        
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData({
            ...userSnap.data(),
            email: currentUser.email,
            displayName: currentUser.displayName
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados do perfil."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando perfil...</span>
      </div>
    );
  }

  if (!userData && !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p>Você precisa estar logado para ver esta página.</p>
      </div>
    );
  }

  const handleCancelSubscription = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuário não encontrado."
        });
        return;
      }
      
      const userRef = doc(db, "users", currentUser.uid);
      
      // Update the subscription status in Firestore
      await updateDoc(userRef, {
        assinaturaAtiva: false
      });
      
      // Update local state
      setUserData({
        ...userData,
        assinaturaAtiva: false
      });
      
      // Show success message
      toast({
        title: "Sucesso",
        description: "Sua assinatura foi cancelada com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível cancelar sua assinatura. Tente novamente mais tarde."
      });
    }
  };

  const handleEditProfile = () => {
    toast({
      title: "Aviso",
      description: "Funcionalidade de edição de perfil ainda não implementada.",
    });
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto px-4">
      <div className="flex items-center mb-6">
        <User className="h-8 w-8 mr-3 text-primary" />
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p className="text-lg">{userData?.email || user?.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Nome</h3>
              <p className="text-lg">{userData?.displayName || user?.name || "Não definido"}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Dados da Assinatura</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Plano</h4>
                <p className="text-lg">
                  {userData?.role === 'admin' ? "Admin" : userData?.assinaturaAtiva || user?.assinaturaAtiva ? "Premium" : "Básico"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <p className="text-lg">
                  {userData?.assinaturaAtiva || user?.assinaturaAtiva ? 
                    <span className="text-green-600">Ativa</span> : 
                    <span className="text-yellow-600">Inativa</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4">
            <Button 
              variant="default" 
              className="flex-1"
              onClick={handleEditProfile}
            >
              Editar Perfil
            </Button>
            
            {(userData?.assinaturaAtiva || user?.assinaturaAtiva) && (
              <Button 
                variant="outline" 
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:border-red-700 dark:text-red-500"
                onClick={handleCancelSubscription}
              >
                Cancelar Assinatura
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
