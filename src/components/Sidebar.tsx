import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  ChevronLeft,
  KanbanSquare,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "@tanstack/react-router";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "My Tasks", icon: CheckSquare },
  { to: "/team", label: "Team", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="z-40 flex-shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      <div className={cn("h-16 flex items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-5")}>
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary grid place-items-center shrink-0">
            <KanbanSquare className="size-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-display font-bold text-lg tracking-tight">Plane</span>}
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-all relative",
                active
                  ? "bg-primary text-primary-foreground accent-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => { logout(); navigate({ to: "/" }); }}
          className={cn(
            "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent w-full transition-all",
            collapsed && "justify-center px-0",
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="size-5 shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent w-full transition-all",
            collapsed && "justify-center px-0",
          )}
        >
          <ChevronLeft className={cn("size-5 shrink-0 transition-transform", collapsed && "rotate-180")} strokeWidth={1.75} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
