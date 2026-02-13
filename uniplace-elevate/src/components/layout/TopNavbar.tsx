import { Bell, Settings, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TopNavbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-base font-medium text-foreground">Welcome back, Admin</h2>

      <div className="flex items-center gap-3">

        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* User Profile */}
        <div className="flex items-center gap-3 mr-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
            AD
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-foreground leading-none">TnP Admin</p>
            <p className="text-xs text-muted-foreground mt-1">Administrator</p>
          </div>
        </div>

        {/* Logout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Log out</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}