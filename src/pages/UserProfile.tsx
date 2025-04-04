
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    email: "",
    displayName: "",
    phone: "",
    cpf: ""
  });
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
          const userDataFromFirestore = userSnap.data();
          const formattedUserData = {
            ...userDataFromFirestore,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
          } as UserData;
          
          setUserData(formattedUserData);
          setFormData(formattedUserData);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
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
      
      // Only update fields that should be stored in Firestore
      await updateDoc(userRef, {
        phone: formData.phone,
        cpf: formData.cpf
      });
      
      // Update local state
      setUserData(formData);
      
      // Exit edit mode
      setIsEditing(false);
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar seu perfil. Tente novamente mais tarde."
      });
    }
  };

  const handleCancelEdit = () => {
    setFormData(userData || { email: "", displayName: "" });
    setIsEditing(false);
  };

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
        ...userData as UserData,
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
            >
              <X size={18} />
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProfile} 
              className="flex items-center gap-2"
            >
              <Save size={18} />
              Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="space-y-6">
          {/* Dados Pessoais */}
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
                      value={formData.displayName}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p className="text-lg py-2">{userData?.displayName || user?.name || "Não definido"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input 
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-2">
                      <Mail size={18} className="text-muted-foreground" />
                      <p className="text-lg">{userData?.email || user?.email}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  {isEditing ? (
                    <Input 
                      id="phone"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleInputChange}
                      placeholder="(XX) XXXXX-XXXX"
                    />
                  ) : (
                    <div className="flex items-center gap-2 py-2">
                      <Phone size={18} className="text-muted-foreground" />
                      <p className="text-lg">{userData?.phone || "Não informado"}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  {isEditing ? (
                    <Input 
                      id="cpf"
                      name="cpf"
                      value={formData.cpf || ""}
                      onChange={handleInputChange}
                      placeholder="XXX.XXX.XXX-XX"
                    />
                  ) : (
                    <p className="text-lg py-2">{userData?.cpf || "Não informado"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Assinatura */}
          <div className="pt-4 border-t border-border">
            <h2 className="text-xl font-semibold mb-4">Dados da Assinatura</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
