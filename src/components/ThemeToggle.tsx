
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="Toggle theme"
      className="relative overflow-hidden group"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 relative z-10 group-hover:text-[#bf00ff] transition-colors" />
      ) : (
        <Sun className="h-5 w-5 relative z-10 group-hover:text-[#00ffff] transition-colors" />
      )}
      <span className="absolute inset-0 bg-gradient-to-tr from-[#00ffff]/20 to-[#bf00ff]/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"></span>
    </Button>
  );
}
