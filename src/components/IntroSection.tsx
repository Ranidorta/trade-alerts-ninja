
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IntroSectionProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

const IntroSection = ({
  title,
  description,
  buttonText,
  buttonLink
}: IntroSectionProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-b from-primary/10 to-background py-12 px-4 rounded-lg mb-8">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
          {title}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {description}
        </p>
        <Button 
          size="lg" 
          onClick={() => navigate(buttonLink)}
          className="animate-pulse-subtle"
        >
          {buttonText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default IntroSection;
