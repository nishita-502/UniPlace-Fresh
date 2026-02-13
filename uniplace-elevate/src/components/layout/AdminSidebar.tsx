import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Trophy,
  Users,
  Calendar,
  Code2,
  FileText,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Companies", path: "/companies" },
  { icon: Briefcase, label: "Job Postings", path: "/job-postings" },
  { icon: Trophy, label: "Results", path: "/results" },
  { icon: Users, label: "Students Database", path: "/students" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Code2, label: "Hackathons", path: "/hackathons" },
  { icon: FileText, label: "Blogs Approval", path: "/blogs" },
  { icon: Mail, label: "Email Center", path: "/email" },
  { icon: BarChart3, label: "Reports & Exports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

// FIX: Changed from 'export default function' to 'export function'
export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="w-64 bg-[#113a2f] text-white p-4 flex flex-col h-screen">
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">UniPlace</h1>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-[#25cba1] text-[#0d2e25] shadow-md translate-x-1"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-[#0d2e25]" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="pt-4 mt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-md text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
        <div className="mt-4 px-3 text-xs text-gray-500">
          © 2026 UniPlace
        </div>
      </div>
    </div>
  );
}