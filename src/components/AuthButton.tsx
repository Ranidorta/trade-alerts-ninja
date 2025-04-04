
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Crown, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const AuthButton = () => {
  const { user, logout, isLoading, hasActiveSubscription, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <span className="animate-pulse">Carregando...</span>
      </Button>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {isAdmin() && <ShieldCheck size={16} className="text-amber-500" />}
            {!isAdmin() && hasActiveSubscription() && <Crown size={16} className="text-amber-500" />}
            <span className="max-w-[100px] truncate">{user.name || user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user.email}</span>
              {isAdmin() && (
                <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-500 border-amber-500/50">
                  Administrador
                </Badge>
              )}
              {!isAdmin() && (
                <Badge 
                  variant="outline" 
                  className={`mt-1 ${hasActiveSubscription() ? 
                    'bg-amber-500/10 text-amber-500 border-amber-500/50' : 
                    'bg-slate-500/10 text-slate-400 border-slate-500/50'}`}
                >
                  {hasActiveSubscription() ? 'Premium' : 'Usuário Básico'}
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2"
            onClick={() => navigate('/profile')}
          >
            <User size={16} />
            <span>Meu Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2 text-destructive"
            onClick={() => logout()}
          >
            <LogOut size={16} />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => window.location.href = "/login"}>
      Entrar
    </Button>
  );
};

export default AuthButton;
