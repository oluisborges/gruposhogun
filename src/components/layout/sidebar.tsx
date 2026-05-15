"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  LogOut,
  BarChart3,
  Target,
  DollarSign,
  Trophy,
  TrendingUp,
  Calculator,
  Database,
  UserCircle,
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
    label: "Metas",
    href: "/dashboard/metas",
    icon: Target,
  },
  {
    label: "PIX",
    href: "/dashboard/pix",
    icon: DollarSign,
  },
  {
    label: "Ranking",
    href: "/dashboard/ranking",
    icon: Trophy,
    roles: ["OWNER", "COORDINATOR"],
  },
  {
    label: "Gráficos",
    href: "/dashboard/graficos",
    icon: TrendingUp,
  },
  {
    label: "Calculadora",
    href: "/dashboard/calculadoras/investimento",
    icon: Calculator,
  },
  {
    label: "HUB de Dados",
    href: "/dashboard/dash",
    icon: Database,
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
    <aside className="w-60 h-full flex flex-col bg-[#0a100c] border-r border-[#1f2a23]">
      {/* Brand */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[#1f2a23]">
        <div
          className="w-7 h-7 rounded-[6px] flex-shrink-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #244a32, #15301f)", border: "1px solid #284d36" }}
        >
          <span className="text-[10px] font-bold text-[#9be03a] font-mono">S</span>
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-[#e6efe8] font-bold tracking-wide uppercase text-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SHOGUN
          </span>
          <span className="text-[10px] text-[#4a5450] tracking-wider">Central · v2</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        <p
          className="px-3 pt-2 pb-1"
          style={{ fontSize: "10px", letterSpacing: ".2em", textTransform: "uppercase", color: "#4a5450" }}
        >
          Navegação
        </p>
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group overflow-hidden",
                isActive
                  ? "text-[#e6efe8] font-medium"
                  : "text-[#a8b3aa] hover:bg-[#121b15] hover:text-[#e6efe8]"
              )}
              style={
                isActive
                  ? { background: "linear-gradient(90deg, rgba(125,193,40,0.14), rgba(125,193,40,0.04))" }
                  : undefined
              }
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
                  style={{ background: "#7DC128" }}
                />
              )}
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-[#7DC128]" : ""
                )}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#1f2a23] p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #244a32, #15301f)",
              border: "1px solid #284d36",
            }}
          >
            <span className="text-xs font-semibold text-[#9be03a]">
              {initials(user.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#e6efe8] truncate">{user.name}</p>
            <p className="text-[11px] text-[#4a5450] truncate">{user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1 rounded text-[#6e7a70] hover:text-[#7DC128] transition-colors"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
