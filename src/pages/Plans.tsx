
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
}

const Plans = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  
  const plans: Plan[] = [
    {
      id: "basic",
      name: "Básico",
      price: 0,
      billing: "para sempre",
      description: "Para começar a explorar nossos sinais",
      features: [
        "3 sinais por semana",
        "Acesso a histórico limitado",
        "Atualização diária",
        "Acesso básico ao painel"
      ],
      notIncluded: [
        "Notificações Telegram",
        "Suporte prioritário",
        "Análises detalhadas",
        "Comunidade VIP"
      ]
    },
    {
      id: "premium",
      name: "Premium",
      price: isYearly ? 79 : 99,
      billing: isYearly ? "/mês, cobrança anual" : "/mês",
      description: "Para traders sérios que buscam resultados",
      features: [
        "Sinais ilimitados em tempo real",
        "Notificações via Telegram",
        "Acesso completo ao histórico",
        "Suporte prioritário 24/7",
        "Análises técnicas detalhadas",
        "Acesso a comunidade VIP"
      ],
      popular: true
    },
    {
      id: "vip",
      name: "VIP",
      price: isYearly ? 149 : 199,
      billing: isYearly ? "/mês, cobrança anual" : "/mês",
      description: "Para traders profissionais e institucionais",
      features: [
        "Tudo do plano Premium",
        "Sinais exclusivos de alta precisão",
        "Consultoria personalizada",
        "Acesso a webinars exclusivos",
        "Bot de trading automatizado",
        "Análises fundamentalistas"
      ]
    }
  ];

  const handleSubscribe = (planId: string) => {
    if (planId === "basic") {
      // For the free plan, just redirect to login/signup
      localStorage.setItem("selectedPlan", planId);
      navigate("/login");
      return;
    }
    
    // For paid plans, in a real application, this would redirect to a payment page
    // For now, we'll just show a toast and redirect to login/signup
    toast.success(`Plano ${planId} selecionado! Redirecionando para pagamento...`);
    localStorage.setItem("selectedPlan", planId);
    
    // Mock payment process
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/20 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Selecione o plano que melhor atende às suas necessidades e comece a receber sinais de trading de alta qualidade
          </p>
          
          <div className="flex items-center justify-center mt-8 mb-10">
            <span className={`mr-3 text-sm ${!isYearly ? 'font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
              Mensal
            </span>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isYearly ? 'bg-primary' : 'bg-input'
              }`}
              onClick={() => setIsYearly(!isYearly)}
            >
              <span
                className={`${
                  isYearly ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 rounded-full bg-background transition-transform`}
              />
            </button>
            <span className={`ml-3 text-sm ${isYearly ? 'font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
              Anual <span className="text-green-500 text-xs">Economize 20%</span>
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`overflow-hidden ${
                plan.popular ? 'border-primary shadow-lg relative' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                  Mais Popular
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Grátis' : `R$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-slate-600 dark:text-slate-300 ml-1 text-sm">
                      {plan.billing}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0 mr-2 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  
                  {plan.notIncluded?.map((feature, i) => (
                    <div key={i} className="flex items-start text-slate-500 dark:text-slate-400">
                      <X className="h-5 w-5 text-slate-400 shrink-0 mr-2 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full ${plan.popular ? 'bg-primary' : ''}`}
                >
                  {plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Perguntas Frequentes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-8">
            <div className="space-y-2">
              <h3 className="font-semibold">Como funciona a assinatura?</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Após escolher um plano, você terá acesso imediato a todos os recursos incluídos. Os sinais são enviados em tempo real via painel e Telegram.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Posso cancelar a qualquer momento?</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Sim, você pode cancelar sua assinatura a qualquer momento. Não há contratos de longo prazo ou taxas de cancelamento.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Como recebo os sinais?</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Os sinais são enviados diretamente para o seu painel e, nos planos pagos, também via Telegram para garantir que você não perca nenhuma oportunidade.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Qual é a taxa de sucesso dos sinais?</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Nossa taxa de sucesso histórica é de aproximadamente 85% para sinais que atingem pelo menos um dos alvos de lucro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
