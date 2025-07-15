
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const PricingSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubscribe = () => {
    if (!user) {
      navigate("/login");
    } else {
      navigate("/profile");
    }
  };

  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Escolha o plano ideal para você</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Aumente suas chances de sucesso com sinais de qualidade e análises em tempo real
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Plano Gratuito */}
          <div className="relative bg-card border border-border rounded-xl shadow-sm p-6 transition-all duration-200 hover:shadow-md flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Plano Básico</h3>
              <p className="text-muted-foreground">Acesso limitado a sinais e funcionalidades</p>
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-bold">
                R$ 0
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </div>
            </div>
            
            <div className="space-y-3 mb-8 flex-grow">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Acesso a sinais básicos</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Histórico limitado</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Visão geral do mercado</span>
              </div>
            </div>
            
            <Button
              className="w-full"
              variant="outline"
              disabled
            >
              Plano Atual
            </Button>
          </div>
          
          {/* Plano Premium */}
          <div className="relative bg-card rounded-xl shadow-lg p-6 border-2 border-crypto-purple transition-all duration-200 hover:shadow-glow-lg flex flex-col h-full">
            <div className="absolute -top-4 right-4 bg-crypto-purple text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Crown size={16} className="mr-1" />
              Recomendado
            </div>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Plano Premium</h3>
              <p className="text-muted-foreground">Acesso completo a todos os recursos</p>
            </div>
            
            <div className="mb-6">
              <div className="text-3xl font-bold">
                R$ 49,90
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </div>
            </div>
            
            <div className="space-y-3 mb-8 flex-grow">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span><strong>Todos</strong> os sinais em tempo real</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Histórico completo e análises detalhadas</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Dashboard de performance exclusivo</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Suporte 24/7 via Telegram</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-success mr-2 flex-shrink-0" />
                <span>Alertas personalizados</span>
              </div>
            </div>
            
            <Button 
              variant="success"
              className="w-full font-semibold"
              onClick={handleSubscribe}
            >
              {user ? "Assinar Premium" : "Assinar Agora"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
