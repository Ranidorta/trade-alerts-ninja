import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

export default function UserMenuButton() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Button asChild>
        <Link to="/auth">Login</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link to="/profile">
          <User className="h-4 w-4 mr-2" />
          {user.email}
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}