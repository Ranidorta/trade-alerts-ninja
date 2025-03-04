
import React, { useState } from "react";
import { TradingSignal } from "@/lib/types";
import { mockActiveSignals, mockHistoricalSignals } from "@/lib/mockData";
import { Plus, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import SignalCard from "@/components/SignalCard";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const [activeSignals] = useState<TradingSignal[]>(mockActiveSignals);
  const [historySignals] = useState<TradingSignal[]>(mockHistoricalSignals);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const refreshData = () => {
    toast({
      title: "Refreshed",
      description: "Signal data has been refreshed",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage trading signals</p>
        </div>
        <div className="flex mt-4 md:mt-0 space-x-3">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Signal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <CardHeader>
                <CardTitle>Create New Signal</CardTitle>
                <CardDescription>Add a new trading signal to the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-10 text-muted-foreground">
                  Signal creation form placeholder
                </p>
              </CardContent>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" className="mb-8">
        <TabsList>
          <TabsTrigger value="active">Active Signals</TabsTrigger>
          <TabsTrigger value="history">Signal History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {activeSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {historySignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Admin Settings
              </CardTitle>
              <CardDescription>Configure admin preferences and permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-10 text-muted-foreground">
                Settings placeholder
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
