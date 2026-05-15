"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  LogOut,
  ChevronRight,
  UserCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatting";
import type { Role } from "@prisma/client";

interface SidebarUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Overview",
    href: "/dashboard/overview",
    icon: BarChart3,
  },
  {
    label: "Clientes",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    label: "Tarefas",
    href: "/dashboard/tasks",
    icon: CheckSquare,
  },
  {
    label: "Usuários",
    href: "/dashboard/users",
    icon: Users,
    roles: ["OWNER", "COORDINATOR"],
  },
  {
    label: "Perfil",
    href: "/dashboard/profile",
    icon: UserCircle,
  },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <aside className="w-60 h-full bg-neutral-950 border-r border-neutral-800 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-neutral-800">
        <div className="w-6 h-6 bg-red-500 rounded-sm flex-shrink-0" />
        <span className="font-bold text-white text-sm tracking-tight">Grupo Shogun</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group",
                isActive
                  ? "bg-red-500/10 text-red-400 font-medium"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-red-400" : ""
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-red-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-red-400">
              {initials(user.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-neutral-500 truncate">{user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
