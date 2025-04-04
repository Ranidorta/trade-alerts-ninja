
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleCheckout = async () => {
    // Aqui iria a lógica de integração com o gateway de pagamento
    // Por enquanto, apenas mostra um alerta
    alert("Integração com gateway de pagamento será implementada em breve!");
  };

  return (
    <div className="container py-12 max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Crown className="mr-3 text-amber-500" size={28} />
        Assinar Plano Premium
      </h1>

      <Card className="p-6 border-2 border-crypto-purple shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Plano Premium</h2>
            <p className="text-muted-foreground mb-2">
              Acesso completo a todos os recursos e sinais em tempo real
            </p>
            
            <div className="mt-6 text-3xl font-bold">
              R$ 49,90
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </div>

            <Button 
              onClick={handleCheckout}
              variant="success" 
              className="mt-6 w-full font-semibold"
            >
              Assinar Agora
            </Button>
          </div>

          <div className="border-t md:border-l md:border-t-0 pt-4 md:pt-0 md:pl-8 mt-4 md:mt-0">
            <h3 className="font-medium mb-4">O que está incluído:</h3>
            
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>Todos os sinais em tempo real</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>Dashboard de performance exclusivo</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>Histórico completo e análises detalhadas</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>Suporte 24/7 via Telegram</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span>Alertas personalizados</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Checkout;
