import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart4,
  Presentation,
  Clock,
  LineChart,
  Trophy,
  Zap,
  TrendingUp,
  Activity,
  Settings
} from "lucide-react";

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
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Sinais Clássicos",
    url: "/signals",
    icon: BarChart4,
    description: "Sinais tradicionais de trading"
  },
  {
    title: "Trading Esportivo",
    url: "/signals?tab=esportivo",
    icon: Trophy,
    description: "Sinais para trading esportivo"
  },
  {
    title: "Histórico",
    url: "/history",
    icon: Clock,
    description: "Histórico de sinais"
  },
  {
    title: "Performance",
    url: "/performance",
    icon: LineChart,
    description: "Dashboard de performance"
  },
  {
    title: "Mercado",
    url: "/market",
    icon: Presentation,
    description: "Visão geral do mercado"
  }
];

const toolsItems = [
  {
    title: "Monster Signals",
    url: "/signals?strategy=monster",
    icon: Zap,
    description: "Sinais avançados com IA"
  },
  {
    title: "Análise Técnica",
    url: "/signals?view=analysis",
    icon: TrendingUp,
    description: "Ferramentas de análise"
  },
  {
    title: "Monitor Live",
    url: "/signals?monitor=live",
    icon: Activity,
    description: "Monitoramento em tempo real"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentSearch = location.search;

  const isActive = (url: string) => {
    if (url.includes('?')) {
      const [path, search] = url.split('?');
      return currentPath === path && currentSearch.includes(search.split('=')[1]);
    }
    return currentPath === url;
  };

  const getNavClassName = (url: string) => {
    const active = isActive(url);
    return active 
      ? "bg-accent text-accent-foreground font-medium" 
      : "hover:bg-accent/50 transition-colors";
  };

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarContent className="gap-2">
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={item.description}
                    >
                      <item.icon className="h-4 w-4" />
                      {!state || state === "expanded" ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="sr-only">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ferramentas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClassName(item.url)}
                      title={item.description}
                    >
                      <item.icon className="h-4 w-4" />
                      {!state || state === "expanded" ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="sr-only">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}