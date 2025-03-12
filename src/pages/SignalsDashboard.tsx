
import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalStatus } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { 
  ArrowUpDown, 
  Filter, 
  Search, 
  Bell,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { generateAllSignals, checkForUpdatedPrices } from "@/lib/apiServices";
import "../layouts/MainLayout.css";

const SignalsDashboard = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Load signals from API
  const fetchSignals = useCallback(async () => {
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
  }, []);
  
  // Initial data load
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);
  
  // Auto refresh of signals
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    if (autoRefresh) {
      // Check for price updates every 30 seconds
      intervalId = setInterval(async () => {
        try {
          const updatedSignals = await checkForUpdatedPrices(signals);
          if (updatedSignals && updatedSignals.length > 0) {
            console.log("Updated signals with new prices:", updatedSignals);
            setSignals(updatedSignals);
            setFilteredSignals(prev => {
              // Apply current filters to the updated signals
              return filterSignals(updatedSignals, searchQuery, statusFilter, sortBy);
            });
            setLastUpdated(new Date());
          }
        } catch (error) {
          console.error("Error updating prices:", error);
        }
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, signals, searchQuery, statusFilter, sortBy]);
  
  // Filter function
  const filterSignals = (
    signals: TradingSignal[],
    query: string,
    statusFilter: string,
    sortOrder: "newest" | "oldest"
  ): TradingSignal[] => {
    let result = [...signals];
    
    // Filter by search query
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      result = result.filter(signal => 
        signal.symbol.toLowerCase().includes(lowercaseQuery) || 
        signal.trendType.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(signal => signal.status === statusFilter);
    }
    
    // Sort results
    result.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  };
  
  // Apply filters when any filter changes
  useEffect(() => {
    const filtered = filterSignals(signals, searchQuery, statusFilter, sortBy);
    setFilteredSignals(filtered);
  }, [signals, searchQuery, statusFilter, sortBy]);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };
  
  // Toggle sort order
  const handleSortToggle = () => {
    setSortBy(sortBy === "newest" ? "oldest" : "newest");
  };
  
  // Format last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return "just now";
    } else if (diffInMinutes === 1) {
      return "1 minute ago";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours === 1) {
        return "1 hour ago";
      } else {
        return `${diffInHours} hours ago`;
      }
    }
  };
  
  // Generate new signals
  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    try {
      await fetchSignals();
      toast({
        title: "Signals generated",
        description: "New trading signals have been generated",
      });
    } catch (error) {
      console.error("Error generating signals:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast({
      title: `Auto refresh ${!autoRefresh ? 'enabled' : 'disabled'}`,
      description: `Signal prices will ${!autoRefresh ? 'now' : 'no longer'} automatically update`,
    });
  };
  
  return (
    <div className="main-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trading Signals</h1>
          <p className="page-description">
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
            {isGenerating ? 'Generating...' : 'Generate Signals'}
          </Button>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={toggleAutoRefresh}
            />
            <Label htmlFor="auto-refresh">Auto refresh</Label>
          </div>
        </div>
      </div>
      
      <div className="section-container">
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search signals..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={SignalStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={SignalStatus.COMPLETED}>Completed</SelectItem>
                <SelectItem value={SignalStatus.CANCELLED}>Cancelled</SelectItem>
                <SelectItem value={SignalStatus.TARGET_HIT}>Target Hit</SelectItem>
                <SelectItem value={SignalStatus.STOP_LOSS_HIT}>Stop Loss Hit</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={handleSortToggle}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortBy === "newest" ? "Newest First" : "Oldest First"}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 w-full rounded-md bg-muted"></div>
              ))}
            </div>
          </div>
        ) : filteredSignals.length > 0 ? (
          <div className="grid-container">
            {filteredSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-semibold">No signals found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No signals are available yet. Try generating signals."}
            </p>
            {(!searchQuery && statusFilter === "all") && (
              <Button 
                onClick={handleGenerateSignals} 
                variant="default"
                className="mt-4"
                disabled={isGenerating}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Generating...' : 'Generate Signals'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalsDashboard;
