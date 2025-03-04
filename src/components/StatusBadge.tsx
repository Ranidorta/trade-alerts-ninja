
import { SignalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, X, Rocket } from "lucide-react";

interface StatusBadgeProps {
  status: SignalStatus;
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "ACTIVE":
        return {
          label: "Active",
          icon: <Check className="h-3.5 w-3.5" />,
          className: "bg-success/15 text-success border-success/30"
        };
      case "COMPLETED":
        return {
          label: "Completed",
          icon: <X className="h-3.5 w-3.5" />,
          className: "bg-error/15 text-error border-error/30"
        };
      case "WAITING":
        return {
          label: "Waiting",
          icon: <Rocket className="h-3.5 w-3.5" />,
          className: "bg-warning/15 text-warning border-warning/30"
        };
      default:
        return {
          label: "Unknown",
          icon: null,
          className: "bg-gray-100 text-gray-800"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border animate-in",
        config.className,
        className
      )}
    >
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </div>
  );
};

export default StatusBadge;
