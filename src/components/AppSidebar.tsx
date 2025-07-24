import { useState, useEffect } from "react";
import { 
  Home,
  BarChart4, 
  Clock, 
  LineChart, 
  Presentation, 
  Crown, 
  User, 
  LogOut,
  Settings
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import NinjaLogo from "@/components/NinjaLogo";

const mainItems = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Sinais", url: "/signals", icon: BarChart4 },
  { title: "Histórico", url: "/history", icon: Clock },
  { title: "Classic", url: "/classic-history", icon: Clock },
  { title: "Performance", url: "/performance", icon: LineChart },
  { title: "Mercado", url: "/market", icon: Presentation },
  { title: "Trading Esportivo", url: "/trading-esportivo", icon: Crown },
];

export function AppSidebar() {
  const { state, setOpenMobile, openMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();

  const isActive = (path: string) => currentPath === path;
  const isExpanded = mainItems.some((i) => isActive(i.url));
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  // Auto-close mobile menu on route change
  useEffect(() => {
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  }, [currentPath, isMobile, openMobile, setOpenMobile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-3 px-4 pt-4">
          <NinjaLogo className="w-8 h-8 text-primary" />
          {!isCollapsed && (
            <span className="font-bold text-xl">Trading Ninja</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-6">
        <SidebarGroup className="mb-8">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            OVERVIEW
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                        ${isActive 
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-8">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            UPGRADE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                 <Button 
                  onClick={() => {
                    navigate("/checkout");
                    if (isMobile && openMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  variant="default"
                  size="sm"
                  className={`w-full h-11 justify-start gap-3 ${isCollapsed ? 'px-3' : 'px-3'}`}
                >
                  <Crown className="h-5 w-5" />
                  {!isCollapsed && <span className="text-sm">Premium</span>}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border pt-4 pb-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            SETTINGS
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-1">
            {user && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink 
                      to="/profile" 
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                        ${isActive 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && <span className="text-sm">Perfil</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <ThemeToggle />
                    {!isCollapsed && (
                       <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleLogout();
                          if (isMobile && openMobile) {
                            setOpenMobile(false);
                          }
                        }}
                        className="flex-1 justify-start h-auto p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        <span className="text-sm">Sair</span>
                      </Button>
                    )}
                  </div>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}