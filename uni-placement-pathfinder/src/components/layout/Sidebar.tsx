import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Briefcase,
  User,
  Calendar,
  ClipboardList,
  CalendarDays,
  Trophy,
  FileText,
  BookOpen,
  FilePlus,
  List,
} from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/jobs", icon: Briefcase, label: "Job Profiles" },
  { to: "/profile", icon: User, label: "My Profile" },
  { to: "/interviews", icon: Calendar, label: "Interviews" },
  { to: "/assessments", icon: ClipboardList, label: "Assessments" },
  { to: "/events", icon: CalendarDays, label: "Events" },
  { to: "/competitions", icon: Trophy, label: "Competitions" },
  { to: "/resume", icon: FileText, label: "Resume" },
  { to: "/senior-blogs", icon: BookOpen, label: "Senior Blogs" },
  { to: "/add-blog", icon: FilePlus, label: "Add Blog" },
  { to: "/my-blogs", icon: List, label: "My Blogs" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0">

      {/* Logo */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-border">
        <img
          src={`${import.meta.env.BASE_URL}favicon.png`}
          alt="UniPlace"
          className="w-8 h-8 rounded-lg object-contain"
        />
        <span className="text-lg font-semibold text-foreground">
          UniPlace
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={isActive ? "nav-item-active" : "nav-item-inactive"}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2026 UniPlace
        </p>
      </div>
    </aside>
  );
}
