
import { useState } from "react";
import { SignalType } from "@/lib/types";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, ArrowDown, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  type: z.enum(["LONG", "SHORT"]),
  symbol: z.string().min(1, "Symbol is required"),
  pair: z.string().min(1, "Trading pair is required"),
  entryMin: z.coerce.number().positive("Entry price must be positive"),
  entryMax: z.coerce.number().positive("Entry price must be positive"),
  stopLoss: z.coerce.number().positive("Stop loss must be positive"),
  leverage: z.coerce.number().int().positive("Leverage must be positive"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema> & {
  targets: { price: number }[];
};

// Initial form values
const defaultValues: FormValues = {
  type: "LONG",
  symbol: "",
  pair: "",
  entryMin: 0,
  entryMax: 0,
  stopLoss: 0,
  leverage: 1,
  notes: "",
  targets: [{ price: 0 }, { price: 0 }, { price: 0 }],
};

interface CreateSignalFormProps {
  onSuccess?: () => void;
}

const CreateSignalForm = ({ onSuccess }: CreateSignalFormProps) => {
  const [targets, setTargets] = useState([{ price: 0 }, { price: 0 }, { price: 0 }]);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const { watch, setValue } = form;
  const type = watch("type");
  
  // Handle target changes
  const handleTargetChange = (index: number, value: string) => {
    const newTargets = [...targets];
    newTargets[index].price = parseFloat(value) || 0;
    setTargets(newTargets);
  };
  
  // Add new target
  const addTarget = () => {
    if (targets.length < 5) {
      setTargets([...targets, { price: 0 }]);
    }
  };
  
  // Remove target
  const removeTarget = (index: number) => {
    if (targets.length > 1) {
      const newTargets = [...targets];
      newTargets.splice(index, 1);
      setTargets(newTargets);
    }
  };
  
  // Form submission
  const onSubmit = (values: FormValues) => {
    // Calculate average entry
    const entryAvg = (values.entryMin + values.entryMax) / 2;
    
    // Validate targets
    if (type === "LONG") {
      // For LONG positions, targets should be higher than entry
      const invalidTargets = targets.some(t => t.price <= entryAvg);
      if (invalidTargets) {
        toast.error("Take profit targets must be higher than entry price for LONG positions");
        return;
      }
      
      // Stop loss should be lower than entry
      if (values.stopLoss >= entryAvg) {
        toast.error("Stop loss must be lower than entry price for LONG positions");
        return;
      }
    } else {
      // For SHORT positions, targets should be lower than entry
      const invalidTargets = targets.some(t => t.price >= entryAvg);
      if (invalidTargets) {
        toast.error("Take profit targets must be lower than entry price for SHORT positions");
        return;
      }
      
      // Stop loss should be higher than entry
      if (values.stopLoss <= entryAvg) {
        toast.error("Stop loss must be higher than entry price for SHORT positions");
        return;
      }
    }
    
    const signalData = {
      ...values,
      entryAvg,
      targets: targets.map((target, index) => ({
        level: index + 1,
        price: target.price,
        hit: false,
      })),
      status: "WAITING" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // In a real app, you'd send this to your API
    console.log("Signal created:", signalData);
    
    toast.success("Signal created successfully!");
    form.reset(defaultValues);
    setTargets([{ price: 0 }, { price: 0 }, { price: 0 }]);
    
    if (onSuccess) {
      onSuccess();
    }
  };
  
  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>Create New Trading Signal</CardTitle>
        <CardDescription>
          Add a new trading signal for traders to follow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signal Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signal Type</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={field.value === "LONG" ? "default" : "outline"}
                        className={`flex-1 ${field.value === "LONG" ? "bg-success hover:bg-success/90" : ""}`}
                        onClick={() => field.onChange("LONG")}
                      >
                        <ArrowUp className="mr-2 h-4 w-4" />
                        LONG
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "SHORT" ? "default" : "outline"}
                        className={`flex-1 ${field.value === "SHORT" ? "bg-error hover:bg-error/90" : ""}`}
                        onClick={() => field.onChange("SHORT")}
                      >
                        <ArrowDown className="mr-2 h-4 w-4" />
                        SHORT
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Leverage */}
              <FormField
                control={form.control}
                name="leverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leverage (x)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leverage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 5, 10, 20, 50, 100].map((value) => (
                          <SelectItem key={value} value={value.toString()}>
                            {value}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Symbol */}
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="BTC" {...field} />
                    </FormControl>
                    <FormDescription>
                      Short name of the cryptocurrency
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Pair */}
              <FormField
                control={form.control}
                name="pair"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Pair</FormLabel>
                    <FormControl>
                      <Input placeholder="BTCUSDT" {...field} />
                    </FormControl>
                    <FormDescription>
                      Full trading pair name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Entry Min */}
              <FormField
                control={form.control}
                name="entryMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Min</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Entry Max */}
              <FormField
                control={form.control}
                name="entryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Max</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Stop Loss */}
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop Loss</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Targets */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel>Take Profit Targets</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTarget}
                  disabled={targets.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Target
                </Button>
              </div>
              
              {targets.map((target, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <FormLabel className="text-sm">{`TP${index + 1}`}</FormLabel>
                    <Input
                      type="number"
                      step="any"
                      value={target.price}
                      onChange={(e) => handleTargetChange(index, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTarget(index)}
                    disabled={targets.length <= 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional information about this signal..."
                      {...field}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              <Check className="mr-2 h-4 w-4" />
              Create Signal
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CreateSignalForm;
