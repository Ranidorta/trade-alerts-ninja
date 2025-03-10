
import { useState, useEffect } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import { mockSignals } from "@/lib/mockData";
import SignalCard from "@/components/SignalCard";
import { 
  ArrowUpDown, 
  BarChart3, 
  Search, 
  Bell,
  RefreshCw,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateAllSignals } from "@/lib/apiServices";

const SignalsDashboard = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    // Load initial signals
    const loadData = async () => {
      setIsLoading(true);
      
      if (useMockData) {
        // Use mock signals
        setSignals(mockSignals);
        setFilteredSignals(mockSignals);
      } else {
        // Generate real signals from Bybit
        try {
          const realSignals = await generateAllSignals();
          setSignals(prevSignals => realSignals.length > 0 ? realSignals : prevSignals);
          setFilteredSignals(prevSignals => realSignals.length > 0 ? realSignals : prevSignals);
        } catch (error) {
          console.error("Error loading real signals:", error);
          toast({
            title: "Error loading signals",
            description: "Failed to load signals from Bybit API. Using mock data instead.",
            variant: "destructive"
          });
          // Fallback to mock signals
          setSignals(mockSignals);
          setFilteredSignals(mockSignals);
        }
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [useMockData, toast]);
  
  // Filter and sort signals whenever dependencies change
  useEffect(() => {
    let result = [...signals];
    
    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter(signal => signal.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(signal => 
        signal.symbol.toLowerCase().includes(query) ||
        signal.pair.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });
    
    setFilteredSignals(result);
  }, [signals, statusFilter, searchQuery, sortBy]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleStatusFilter = (status: SignalStatus | "ALL") => {
    setStatusFilter(status);
  };
  
  const handleSort = (type: "newest" | "oldest") => {
    setSortBy(type);
  };
  
  const handleSubscribe = () => {
    toast({
      title: "Subscribed to notifications",
      description: "You'll receive alerts when new signals are posted",
    });
  };
  
  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    toast({
      title: "Generating signals",
      description: "Analyzing market data to find trading opportunities...",
    });
    
    try {
      const newSignals = await generateAllSignals();
      
      if (newSignals.length > 0) {
        // Add new signals to existing ones
        setSignals(prevSignals => [...newSignals, ...prevSignals]);
        
        toast({
          title: "New signals generated",
          description: `Found ${newSignals.length} new trading opportunities`,
        });
      } else {
        toast({
          title: "No new signals",
          description: "No trading opportunities found at this time",
        });
      }
    } catch (error) {
      console.error("Error generating signals:", error);
      toast({
        title: "Error generating signals",
        description: "An error occurred while analyzing market data",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const toggleDataSource = () => {
    setUseMockData(!useMockData);
    toast({
      title: `Using ${!useMockData ? 'mock' : 'real'} data`,
      description: `Switched to ${!useMockData ? 'mock' : 'real Bybit API'} data for signals`,
    });
  };
  
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 animate-pulse">
        <div className="flex justify-between">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-6 bg-slate-200 rounded-full w-1/4"></div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-slate-200 rounded"></div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
      </div>
    ));
  };
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trading Signals</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Current active trading opportunities
          </p>
          <div className="mt-2 flex items-center">
            <span className={`text-xs font-medium px-2 py-1 rounded ${useMockData ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {useMockData ? 'Using Mock Data' : 'Using Bybit API Data'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <Button 
            onClick={toggleDataSource} 
            variant="outline"
            className="border-dashed"
          >
            <Database className="mr-2 h-4 w-4" />
            {useMockData ? 'Switch to Bybit API' : 'Switch to Mock Data'}
          </Button>
          
          <Button 
            onClick={handleGenerateSignals} 
            variant="default"
            disabled={isGenerating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing Market...' : 'Generate Signals'}
          </Button>
          
          <Button onClick={handleSubscribe} variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            Subscribe to Alerts
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search by symbol or pair..."
            className="pl-10"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                {statusFilter === "ALL" ? "All Status" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className={statusFilter === "ALL" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("ALL")}
                >
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={statusFilter === "ACTIVE" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("ACTIVE")}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={statusFilter === "WAITING" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("WAITING")}
                >
                  Waiting
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={statusFilter === "COMPLETED" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleStatusFilter("COMPLETED")}
                >
                  Completed
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort Signals</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className={sortBy === "newest" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleSort("newest")}
                >
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={sortBy === "oldest" ? "bg-slate-100 dark:bg-slate-800" : ""}
                  onClick={() => handleSort("oldest")}
                >
                  Oldest First
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          renderSkeletons()
        ) : filteredSignals.length > 0 ? (
          filteredSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">No signals found</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {searchQuery ? 
                `No signals matching "${searchQuery}" were found. Try a different search term.` : 
                "There are no signals with the selected filter. Try changing your filters or generate new signals."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalsDashboard;
