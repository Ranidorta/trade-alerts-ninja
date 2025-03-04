
import { cn } from "@/lib/utils";
import { Feature } from "@/lib/types";

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const FeatureCard = ({ feature, index }: FeatureCardProps) => {
  return (
    <div 
      className={cn(
        "rounded-xl p-6 glass-card border border-slate-200 hover:border-primary/30 transition-all duration-300",
        "flex flex-col items-center text-center animate-in",
        "hover:shadow-lg",
        "group"
      )}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="mb-4 p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
        {feature.icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
      <p className="text-muted-foreground text-sm">{feature.description}</p>
    </div>
  );
};

export default FeatureCard;
