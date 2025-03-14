
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-20 -left-10 w-40 h-40 bg-crypto-purple/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-crypto-blue/20 rounded-full filter blur-3xl animate-float" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Receba Sinais de Trade em <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-crypto-blue to-crypto-purple">Tempo Real!</span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mb-10">
              Assine agora e receba sinais precisos diretamente no seu Telegram. Maximizando seus lucros com análises profissionais.
            </p>
            
            <Button asChild size="lg" className="px-8 rounded-full shadow-lg hover:shadow-xl transition-all">
              <Link to="/plans">
                Assinar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            {/* Trading illustration */}
            <div className="mt-16 w-full max-w-3xl">
              <div className="relative">
                <div className="glass-card rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg">
                  <div className="bg-background rounded-lg p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-xl">BTC/USDT</h3>
                          <p className="text-sm text-muted-foreground">Sinal de Compra</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-success">↗ LONG</p>
                          <p className="text-sm text-muted-foreground">Alavancagem: 5x</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Entrada</p>
                          <p className="font-semibold">$65,240</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stop Loss</p>
                          <p className="font-semibold text-error">$64,730</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Take Profit 1</p>
                          <p className="font-semibold text-success">$65,950</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Take Profit 2</p>
                          <p className="font-semibold text-success">$66,500</p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div className="bg-crypto-green h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que escolher nossos sinais?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Nossa equipe de analistas profissionais está constantemente monitorando o mercado para fornecer os melhores sinais.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-2xl">✓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sinais Precisos</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Mais de 85% de precisão em nossas análises técnicas e recomendações de entrada.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Tempo Real</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Receba alertas instantâneos no seu Telegram assim que identificarmos oportunidades.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Análise Detalhada</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Cada sinal inclui pontos de entrada, stop loss e múltiplos take profits com fundamentação técnica.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-crypto-blue to-crypto-purple text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para começar a lucrar?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Junte-se a milhares de traders que já estão lucrando com nossos sinais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="default" className="bg-white text-crypto-purple hover:bg-white/90">
              <Link to="/plans">
                Ver Planos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link to="/login">
                Fazer Login
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 bg-slate-100 dark:bg-slate-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold text-primary">CryptoSignals</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                © 2023 Todos os direitos reservados
              </p>
            </div>
            
            <div className="flex flex-wrap gap-6">
              <Link to="/" className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                Início
              </Link>
              <Link to="/plans" className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                Planos
              </Link>
              <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                Login
              </Link>
              <Link to="/signals" className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                Sinais
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
