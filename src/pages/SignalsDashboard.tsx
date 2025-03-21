
import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { 
  ArrowUpDown, 
  BarChart3, 
  Search, 
  Bell,
  RefreshCw,
  Zap,
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
import { generateAllSignals, generateTradingSignal } from "@/lib/apiServices";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GenericSearchBar from "@/components/GenericSearchBar";

const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute in milliseconds

const SignalsDashboard = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [coinSearch, setCoinSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  
  // Function to load signals data
  const loadSignalsData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Generate real signals from Bybit
      const realSignals = await generateAllSignals();
      if (realSignals.length > 0) {
        setSignals(realSignals);
        setFilteredSignals(realSignals);
      } else {
        toast({
          title: "No signals found",
          description: "No trading signals were found from Bybit API.",
        });
      }
    } catch (error) {
      console.error("Error loading signals:", error);
      toast({
        title: "Error loading signals",
        description: "Failed to load signals from Bybit API.",
        variant: "destructive"
      });
      setSignals([]);
      setFilteredSignals([]);
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [toast]);
  
  // Initial data load
  useEffect(() => {
    loadSignalsData();
  }, [loadSignalsData]);
  
  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing signals data...");
      loadSignalsData();
    }, DEFAULT_REFRESH_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, loadSignalsData]);
  
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
  
  const handleCoinSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoinSearch(e.target.value.toUpperCase());
  };

  const handleGenerateSignalForCoin = async () => {
    if (!coinSearch) {
      toast({
        title: "Please enter a symbol",
        description: "Enter a cryptocurrency symbol to generate signals (e.g., BTCUSDT, ETHUSDT)",
      });
      return;
    }

    setIsSearching(true);
    let symbol = coinSearch;
    
    // Add USDT suffix if not present
    if (!symbol.endsWith("USDT")) {
      symbol = `${symbol}USDT`;
    }

    try {
      toast({
        title: "Generating signal",
        description: `Analyzing market data for ${symbol}...`,
      });

      const signal = await generateTradingSignal(symbol);
      
      if (signal) {
        setSignals(prevSignals => {
          // Check if this signal already exists (by ID)
          const exists = prevSignals.some(s => s.id === signal.id);
          if (exists) {
            toast({
              title: "Signal already exists",
              description: `A signal for ${symbol} already exists in your dashboard.`,
            });
            return prevSignals;
          }
          
          toast({
            title: "Signal generated",
            description: `New ${signal.type} signal for ${symbol} has been added to your dashboard.`,
          });
          
          // Add the new signal at the beginning of the array
          return [signal, ...prevSignals];
        });
        
        // Clear the search field
        setCoinSearch("");
      } else {
        toast({
          title: "No signal generated",
          description: `Could not generate a signal for ${symbol}. Market conditions may not meet criteria.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error generating signal for specific coin:", error);
      toast({
        title: "Error generating signal",
        description: `Failed to generate signal for ${symbol}.`,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
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
        setSignals(prevSignals => {
          // Merge signals, avoiding duplicates by ID
          const existingIds = new Set(prevSignals.map(s => s.id));
          const uniqueNewSignals = newSignals.filter(s => !existingIds.has(s.id));
          
          if (uniqueNewSignals.length > 0) {
            toast({
              title: "New signals generated",
              description: `Found ${uniqueNewSignals.length} new trading opportunities`,
            });
            return [...uniqueNewSignals, ...prevSignals];
          }
          
          toast({
            title: "No new signals",
            description: "No new trading opportunities found at this time",
          });
          return prevSignals;
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
      setLastUpdated(new Date());
    }
  };
  
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast({
      title: `Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`,
      description: `Signal data will ${!autoRefresh ? 'now' : 'no longer'} update automatically`,
    });
  };
  
  const handleManualRefresh = () => {
    toast({
      title: "Refreshing signals",
      description: "Updating signal data...",
    });
    loadSignalsData();
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
  
  // Format the last updated time
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trading Signals</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Current active trading opportunities
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-800 font-medium px-2 py-1 rounded">
              Using Bybit API Data
            </span>
            <span className="text-xs text-slate-500">
              Last updated: {formatLastUpdated()}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
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
      
      {/* Search for specific coin signals */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Generate Signal for Specific Coin</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Enter crypto symbol (e.g., BTC, ETH)"
              value={coinSearch}
              onChange={handleCoinSearchChange}
              className="pr-10"
            />
          </div>
          
          <Button 
            onClick={handleGenerateSignalForCoin} 
            disabled={isSearching || !coinSearch}
            className="shrink-0"
          >
            <Zap className={`mr-2 h-4 w-4 ${isSearching ? 'animate-pulse' : ''}`} />
            {isSearching ? 'Analyzing...' : 'Generate Signal'}
          </Button>
        </div>
        
        <p className="text-xs text-slate-500 mt-2">
          Enter a cryptocurrency symbol to generate a trading signal based on current market conditions.
        </p>
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
          <Button 
            onClick={toggleAutoRefresh} 
            variant={autoRefresh ? "default" : "outline"}
            size="icon"
            className="w-10 h-10"
            title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            onClick={handleManualRefresh} 
            variant="outline"
            size="icon"
            className="w-10 h-10"
            title="Refresh signals now"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
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
            <SignalCard 
              key={signal.id} 
              signal={signal} 
              refreshInterval={30000} // Update target status every 30 seconds
            />
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
