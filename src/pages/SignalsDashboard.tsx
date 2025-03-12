
import { useState, useEffect } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import GamerSignalCard from "@/components/GamerSignalCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignals } from "@/hooks/use-signals";
import { Signal } from "@/lib/types";
import { Gamepad, Flame, Target, BarChart } from "lucide-react";

const SignalsDashboard = () => {
  const { data: signals, isLoading, error } = useSignals();
  const [activeTabSignals, setActiveTabSignals] = useState<Signal[]>([]);
  
  // Filter signals based on current tab
  const [activeTab, setActiveTab] = useState("active");
  
  useEffect(() => {
    if (!signals) return;
    
    switch (activeTab) {
      case "active":
        setActiveTabSignals(signals.filter(signal => signal.status === "ACTIVE"));
        break;
      case "completed":
        setActiveTabSignals(signals.filter(signal => signal.status === "COMPLETED"));
        break;
      case "all":
      default:
        setActiveTabSignals(signals);
        break;
    }
  }, [signals, activeTab]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  return (
    <div className="main-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Gamepad className="w-7 h-7" />
            Trading Signals
          </h1>
          <p className="page-description">
            Track and manage your crypto trading signals in real-time
          </p>
        </div>
      </div>
      
      <div className="section-container">
        <Tabs defaultValue="active" onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-[#221F26] border border-[#8B5CF6]/30 p-1">
            <TabsTrigger 
              value="active"
              className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white"
            >
              <Flame className="w-4 h-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white"
            >
              <Target className="w-4 h-4 mr-2" />
              Completed
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white"
            >
              <BarChart className="w-4 h-4 mr-2" />
              All Signals
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[500px] bg-[#221F26] opacity-70" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center p-6 text-[#FF3361]">
                Error loading signals: {error.message}
              </div>
            ) : activeTabSignals.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-[#8B5CF6]/30 rounded-lg">
                <Gamepad className="w-12 h-12 mx-auto text-[#8B5CF6]/50 mb-4" />
                <h3 className="text-lg font-medium text-[#D946EF]">No Active Signals</h3>
                <p className="text-[#c8c8ff]/70 mt-2">There are currently no active trading signals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTabSignals.map((signal) => (
                  <GamerSignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[500px] bg-[#221F26] opacity-70" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center p-6 text-[#FF3361]">
                Error loading signals: {error.message}
              </div>
            ) : activeTabSignals.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-[#8B5CF6]/30 rounded-lg">
                <Gamepad className="w-12 h-12 mx-auto text-[#8B5CF6]/50 mb-4" />
                <h3 className="text-lg font-medium text-[#D946EF]">No Completed Signals</h3>
                <p className="text-[#c8c8ff]/70 mt-2">There are currently no completed trading signals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTabSignals.map((signal) => (
                  <GamerSignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[500px] bg-[#221F26] opacity-70" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center p-6 text-[#FF3361]">
                Error loading signals: {error.message}
              </div>
            ) : activeTabSignals.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-[#8B5CF6]/30 rounded-lg">
                <Gamepad className="w-12 h-12 mx-auto text-[#8B5CF6]/50 mb-4" />
                <h3 className="text-lg font-medium text-[#D946EF]">No Signals Found</h3>
                <p className="text-[#c8c8ff]/70 mt-2">There are currently no trading signals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTabSignals.map((signal) => (
                  <GamerSignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SignalsDashboard;
