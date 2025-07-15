
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Hero from "@/components/Hero";
import FeatureCard from "@/components/FeatureCard";
import SignalCard from "@/components/SignalCard";
import NinjaLogo from "@/components/NinjaLogo";
import PricingSection from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Zap, 
  TrendingUp, 
  Clock, 
  LineChart, 
  Shield, 
  ArrowRight, 
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { mockSignals } from "@/lib/mockData";
import { Feature } from "@/lib/types";

const features: Feature[] = [
  {
    title: "Real-Time Signals",
    description: "Get instant access to high-quality trading signals directly when they're posted.",
    icon: <Zap className="h-6 w-6" />,
  },
  {
    title: "Track Record",
    description: "View our complete history of past signals with transparent performance metrics.",
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    title: "Instant Notifications",
    description: "Receive alerts via Telegram, email, or web push when new signals are available.",
    icon: <Bell className="h-6 w-6" />,
  },
  {
    title: "24/7 Support",
    description: "Our team is always available to answer your questions and provide guidance.",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    title: "Technical Analysis",
    description: "Each signal comes with detailed technical analysis and market insights.",
    icon: <LineChart className="h-6 w-6" />,
  },
  {
    title: "Risk Management",
    description: "Clear stop-loss and take-profit levels to help you manage your risk effectively.",
    icon: <Shield className="h-6 w-6" />,
  },
];

const Index = () => {
  const { user } = useAuth();
  
  // Get the three most recent signals
  const recentSignals = mockSignals.slice(0, 3);
  
  return (
    <div className="min-h-screen">
      <Hero />
      
      {/* Ninja Logo Section */}
      <section className="py-10 flex justify-center">
        <NinjaLogo link="/signals" className="mx-auto" />
      </section>
      
      {/* Features Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Our Signals</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Our trading signals are carefully analyzed and curated to maximize profit potential while minimizing risk.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Recent Signals Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2">Recent Trading Signals</h2>
              <p className="text-slate-600 dark:text-slate-300">
                Stay updated with our latest market opportunities
              </p>
            </div>
            {user ? (
              <Button asChild className="mt-4 md:mt-0">
                <Link to="/signals">
                  View All Signals <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="mt-4 md:mt-0">
                <Link to="/auth">
                  Login to View Signals <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <PricingSection />
      
      {/* Statistics Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Proven Track Record</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                Our team of analysts has consistently delivered profitable signals across all market conditions. We maintain complete transparency with our performance metrics.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="mr-4 p-3 rounded-full bg-success/10 text-success">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">High Success Rate</h3>
                    <p className="text-slate-600 dark:text-slate-300">Over 85% of our signals hit at least one target</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="mr-4 p-3 rounded-full bg-crypto-purple/10 text-crypto-purple">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Consistent Profits</h3>
                    <p className="text-slate-600 dark:text-slate-300">Our signals average 12-15% profit per trade</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="mr-4 p-3 rounded-full bg-crypto-blue/10 text-crypto-blue">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Timely Updates</h3>
                    <p className="text-slate-600 dark:text-slate-300">Real-time updates on all active signals</p>
                  </div>
                </div>
              </div>
              
              {user ? (
                <Button asChild className="mt-8">
                  <Link to="/history">
                    View Performance History <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild className="mt-8">
                  <Link to="/auth">
                    Login to View History <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            
            <div className="relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-crypto-purple/10 rounded-full filter blur-3xl"></div>
              <div className="relative z-10 glass-card rounded-xl p-6 border border-slate-200">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-slate-500">Total Signals</p>
                      <p className="text-3xl font-bold">152</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Success Rate</p>
                      <p className="text-3xl font-bold text-success">87%</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avg. Profit</p>
                      <p className="text-3xl font-bold text-crypto-purple">+14.3%</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avg. Loss</p>
                      <p className="text-3xl font-bold text-error">-3.2%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Bitcoin (BTC)</span>
                      <span className="text-success">+21.4%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-crypto-blue h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ethereum (ETH)</span>
                      <span className="text-success">+16.8%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-crypto-purple h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-1">
                      <span>Solana (SOL)</span>
                      <span className="text-success">+32.1%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-crypto-green h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-crypto-blue to-crypto-purple text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Trading Smarter?</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of traders who are already profiting from our signals.
          </p>
          {user ? (
            <Button asChild size="lg" variant="default" className="bg-white text-crypto-purple hover:bg-white/90">
              <Link to="/signals">
                Get Started Today <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="default" className="bg-white text-crypto-purple hover:bg-white/90">
              <Link to="/auth">
                Get Started Today <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
