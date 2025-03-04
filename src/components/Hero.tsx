
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 grid-pattern opacity-40" />
      
      {/* Gradient orbs */}
      <div className="absolute top-20 -left-10 w-40 h-40 bg-crypto-purple/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-crypto-blue/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            Premium Crypto Trading Signals
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 max-w-4xl leading-tight">
            Make smarter trades with <span className="text-gradient">precise signals</span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mb-8">
            Access professional trading signals curated by expert analysts. Enter and exit positions with confidence and maximize your profits.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="px-8 rounded-full shadow-md hover:shadow-lg transition-all">
              <Link to="/signals">
                View Active Signals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="outline" className="px-8 rounded-full border-slate-300 hover:border-primary transition-all">
              <Link to="/history">
                Explore Track Record
              </Link>
            </Button>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">99%</span>
              <span>Accuracy</span>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">24/7</span>
              <span>Support</span>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">5K+</span>
              <span>Active Traders</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
