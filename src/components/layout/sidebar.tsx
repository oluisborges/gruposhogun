"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, BarChart3, Users, CheckSquare, UserCog,
  Target, DollarSign, Trophy, TrendingUp, Calculator, Database,
  UserCircle, LogOut, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatting";
import type { Role } from "@prisma/client";

interface SidebarUser { id: string; name: string; email: string; role: Role }

const NAV_GROUPS = [
  {
    label: "Operação",
    items: [
      { label: "Dashboard",   href: "/dashboard",          icon: LayoutDashboard },
      { label: "Clientes",    href: "/dashboard/clients",  icon: Users },
      { label: "Tarefas",     href: "/dashboard/tasks",    icon: CheckSquare },
      { label: "Métricas",    href: "/dashboard/overview", icon: BarChart3 },
      { label: "Metas",       href: "/dashboard/metas",    icon: Target },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "PIX",         href: "/dashboard/pix",      icon: DollarSign },
      { label: "Relatórios",  href: "/dashboard/graficos", icon: FileText },
      { label: "Ranking",     href: "/dashboard/ranking",  icon: Trophy, roles: ["OWNER", "COORDINATOR"] as Role[] },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { label: "Calculadoras", href: "/dashboard/calculadoras/investimento", icon: Calculator },
      { label: "HUB de Dados", href: "/dashboard/dash",    icon: Database },
      { label: "Usuários",     href: "/dashboard/users",   icon: UserCog, roles: ["OWNER", "COORDINATOR"] as Role[] },
    ],
  },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="w-[248px] h-full flex flex-col flex-shrink-0"
      style={{ background: "#0a100c", borderRight: "1px solid #1f2a23" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-[22px] py-[18px]" style={{ borderBottom: "1px solid #1f2a23" }}>
        <div
          className="w-11 h-11 rounded-[8px] flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{
            background: "linear-gradient(135deg, #244a32, #15301f)",
            border: "1px solid #284d36",
            color: "#9be03a",
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            letterSpacing: ".06em",
          }}
        >
          S
        </div>
        <div className="flex flex-col gap-[3px]">
          <span
            className="text-[#e6efe8] uppercase tracking-[.08em]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", lineHeight: 1 }}
          >
            Shogun
          </span>
          <span style={{ fontSize: "10px", letterSpacing: ".22em", color: "#4a5450", textTransform: "uppercase", fontWeight: 600 }}>
            Central · v2
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-[18px]">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter(
            (item) => !("roles" in item) || !item.roles || item.roles.includes(user.role)
          );
          if (!visible.length) return null;
          return (
            <div key={group.label} className="px-[14px] mb-2">
              <p style={{ fontSize: "10px", letterSpacing: ".2em", textTransform: "uppercase", color: "#4a5450", fontWeight: 700, padding: "0 10px 8px" }}>
                {group.label}
              </p>
              {visible.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-[8px] mb-[2px] transition-colors",
                      active ? "text-[#e6efe8]" : "text-[#a8b3aa] hover:text-[#e6efe8]"
                    )}
                    style={{
                      padding: "10px 12px",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      background: active
                        ? "linear-gradient(90deg, rgba(125,193,40,0.14), rgba(125,193,40,0.04))"
                        : undefined,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#121b15"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
                  >
                    {active && (
                      <span
                        className="absolute rounded-r-[3px]"
                        style={{ left: -14, top: 8, bottom: 8, width: 3, background: "#7DC128" }}
                      />
                    )}
                    <item.icon
                      className="flex-shrink-0"
                      style={{ width: 20, height: 20, opacity: active ? 1 : 0.85, color: active ? "#7DC128" : "currentColor" }}
                    />
                    {item.label}
                  </Link>
                );
              })}
              <div style={{ height: 1, background: "#1f2a23", margin: "14px 0 4px" }} />
            </div>
          );
        })}
        {/* Perfil no fim */}
        <div className="px-[14px]">
          <Link
            href="/dashboard/profile"
            className={cn("relative flex items-center gap-3 rounded-[8px] transition-colors", isActive("/dashboard/profile") ? "text-[#e6efe8]" : "text-[#a8b3aa] hover:text-[#e6efe8]")}
            style={{
              padding: "10px 12px", fontSize: "13.5px", fontWeight: 500,
              background: isActive("/dashboard/profile") ? "linear-gradient(90deg, rgba(125,193,40,0.14), rgba(125,193,40,0.04))" : undefined,
            }}
            onMouseEnter={(e) => { if (!isActive("/dashboard/profile")) e.currentTarget.style.background = "#121b15"; }}
            onMouseLeave={(e) => { if (!isActive("/dashboard/profile")) e.currentTarget.style.background = ""; }}
          >
            {isActive("/dashboard/profile") && (
              <span className="absolute rounded-r-[3px]" style={{ left: -14, top: 8, bottom: 8, width: 3, background: "#7DC128" }} />
            )}
            <UserCircle style={{ width: 20, height: 20, opacity: 0.85 }} />
            Perfil
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-[14px]" style={{ borderTop: "1px solid #1f2a23" }}>
        <div className="flex items-center gap-[10px] px-2 py-2">
          <div
            className="flex-shrink-0 rounded-[8px] flex items-center justify-center font-bold"
            style={{ width: 36, height: 36, background: "linear-gradient(135deg, #244a32, #15301f)", border: "1px solid #284d36", fontSize: "13px", color: "#9be03a" }}
          >
            {initials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#e6efe8] truncate" style={{ lineHeight: 1.2 }}>{user.name}</p>
            <p className="text-[11px] text-[#6e7a70] truncate">{user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="transition-colors"
            style={{ width: 28, height: 28, borderRadius: 6, display: "grid", placeItems: "center", color: "#6e7a70", border: "1px solid #1f2a23" }}
            title="Sair"
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7DC128"; e.currentTarget.style.background = "#101a14"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6e7a70"; e.currentTarget.style.background = ""; }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
