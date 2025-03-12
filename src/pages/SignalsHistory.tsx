
import { useState, useEffect, useCallback } from "react";
import { TradingSignal } from "@/lib/types";
import SignalCard from "@/components/SignalCard";
import { Calendar, Search, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateAllSignals } from "@/lib/apiServices";
import { useToast } from "@/hooks/use-toast";
import "../layouts/MainLayout.css";

const SignalsHistory = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  const loadSignalHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // We'll use the same function as the dashboard since the other one is not available
      const history = await generateAllSignals();
      setSignals(history);
      setFilteredSignals(history);
    } catch (error) {
      console.error("Error loading signal history:", error);
      toast({
        title: "Error loading history",
        description: "Failed to load signal history. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSignalHistory();
  }, [loadSignalHistory]);

  useEffect(() => {
    let result = [...signals];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(signal => 
        signal.symbol.toLowerCase().includes(query) || 
        signal.type.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(signal => signal.status === statusFilter);
    }

    // Filter by date range
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      result = result.filter(signal => {
        const signalDate = new Date(signal.createdAt);
        return signalDate >= fromDate;
      });
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        result = result.filter(signal => {
          const signalDate = new Date(signal.createdAt);
          return signalDate <= toDate;
        });
      }
    }

    // Sort results
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredSignals(result);
  }, [signals, searchQuery, statusFilter, sortBy, dateRange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleSortToggle = () => {
    setSortBy(sortBy === "newest" ? "oldest" : "newest");
  };

  const handleRefresh = () => {
    loadSignalHistory();
    toast({
      title: "Refreshed",
      description: "Signal history has been refreshed",
    });
  };

  return (
    <div className="main-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Signal History</h1>
          <p className="page-description">
            View past signal performance and outcomes
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                />
              </PopoverContent>
            </Popover>
            
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="target_hit">Target Hit</SelectItem>
                <SelectItem value="stop_loss_hit">Stop Loss Hit</SelectItem>
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
              {searchQuery || statusFilter !== "all" || dateRange?.from
                ? "Try adjusting your filters"
                : "No signal history is available yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalsHistory;
