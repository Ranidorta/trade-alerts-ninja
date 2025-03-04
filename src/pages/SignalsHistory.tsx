
import React, { useState } from "react";
import { TradingSignal } from "@/lib/types";
import { mockHistoricalSignals } from "@/lib/mockData";
import SignalCard from "@/components/SignalCard";
import { Calendar, Filter, SortDesc } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SignalsHistory = () => {
  const [signals] = useState<TradingSignal[]>(mockHistoricalSignals);
  const [activeTab, setActiveTab] = useState("all");

  // Filter signals based on active tab
  const filteredSignals = signals.filter(signal => {
    if (activeTab === "all") return true;
    if (activeTab === "profit") return signal.profit !== undefined && signal.profit > 0;
    if (activeTab === "loss") return signal.profit !== undefined && signal.profit < 0;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Signals History</h1>
          <p className="text-muted-foreground">View past signals and performance</p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm">Filter by date</span>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 flex items-center">
              <SortDesc className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm">Sort by</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="all">All Signals</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="loss">Loss</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSignals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
};

export default SignalsHistory;
