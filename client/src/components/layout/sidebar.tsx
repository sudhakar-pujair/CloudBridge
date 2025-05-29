import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Cloud, Home, Terminal, Activity, Settings, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { id: "welcome", label: "Welcome", icon: Home },
    { id: "ssh", label: "SSH", icon: Terminal },
    { id: "activities", label: "Regular Activities", icon: Activity },
  ];

  return (
    <aside className={cn("bg-card border-r border-border flex flex-col transition-all duration-300", 
      isCollapsed ? "w-16" : "w-60"
    )}>
      {/* Logo Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Cloud className="h-6 w-6 text-primary-foreground" />
          </button>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">Cloud Bridge</h1>
              <p className="text-xs text-muted-foreground">v1.0.0</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-11 px-4 font-medium transition-colors",
                    isCollapsed ? "justify-center" : "justify-start",
                    activeTab === item.id 
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full h-11 px-4 font-medium",
            isCollapsed ? "justify-center" : "justify-start",
            activeTab === "settings" 
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("settings")}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && "Settings"}
        </Button>
      </div>

      {/* User Info */}
      <div className="p-4 bg-muted/30 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("flex items-center w-full hover:bg-accent rounded-lg p-2 transition-colors", isCollapsed ? "justify-center" : "space-x-3")}>
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.username || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role || "User"}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
