
import { Link } from "react-router-dom";

interface NinjaLogoProps {
  link?: string;
  className?: string;
}

const NinjaLogo = ({ link = "/signals", className = "" }: NinjaLogoProps) => {
  // Se estiver sendo usado na navbar (detectado pelo tamanho da classe), não usar o Link
  if (className.includes("w-full h-full")) {
    return (
      <img 
        src="/lovable-uploads/4bbac97e-bbd5-4ba2-be60-7052032c420d.png" 
        alt="Ninja Trading Logo" 
        className="rounded-full shadow-sm"
        width="100%"
        height="100%"
      />
    );
  }

  return (
    <Link 
      to={link}
      className={`block transition-transform hover:scale-105 ${className}`}
      aria-label="Ninja Trading Logo"
    >
      <img 
        src="/lovable-uploads/4bbac97e-bbd5-4ba2-be60-7052032c420d.png" 
        alt="Ninja Trading Logo" 
        className="rounded-full shadow-lg hover:shadow-cyan-500/50"
        width={200}
        height={200}
      />
    </Link>
  );
};

export default NinjaLogo;
