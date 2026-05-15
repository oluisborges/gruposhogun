import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { nowBRT } from "@/lib/date-utils";
import {
  LayoutDashboard,
  AlertCircle,
  ArrowRight,
  Bell,
  BarChart3,
  Target,
  DollarSign,
  Calculator,
  Database,
} from "lucide-react";
import { formatBRTDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { ZeroSpendAlert } from "@/components/dashboard/zero-spend-alert";
import type { Role, TaskPriority } from "@prisma/client";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-[#182219] text-[#6e7a70] border-[#28342a]",
  MEDIUM: "bg-[rgba(232,167,58,0.12)] text-[#e8a73a] border-[rgba(232,167,58,0.2)]",
  HIGH: "bg-[rgba(216,90,74,0.12)] text-[#d85a4a] border-[rgba(216,90,74,0.2)]",
  URGENT: "bg-[rgba(216,90,74,0.18)] text-[#d85a4a] border-[rgba(216,90,74,0.3)]",
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;

  // Fetch top 5 urgent/high priority pending tasks for current user
  const pendingTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { notIn: ["DONE"] },
    },
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "asc" },
    ],
    take: 5,
  });

  const isPrivileged = userRole === "OWNER" || userRole === "COORDINATOR";

  // Report alerts
  const now = nowBRT();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(20, 0, 0, 0);
  if (now < weekStart) weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let alertClientFilter: { id: { in: string[] } } | undefined;
  if (!isPrivileged) {
    const managed = await prisma.clientManager.findMany({
      where: { userId },
      select: { clientId: true },
    });
    alertClientFilter = { id: { in: managed.map((m) => m.clientId) } };
  }

  const alertClients = await prisma.client.findMany({
    where: { active: true, ...alertClientFilter },
    select: {
      id: true,
      name: true,
      reports: {
        where: { createdAt: { gte: weekStart, lte: weekEnd } },
        select: { id: true },
      },
    },
  });

  const alertClientIds = alertClients.map((c) => c.id);
  const monthlyReportClientIds = await prisma.report
    .findMany({
      where: {
        clientId: { in: alertClientIds },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: { clientId: true },
    })
    .then((rs) => new Set(rs.map((r) => r.clientId)));

  const reportAlerts = alertClients
    .map((client) => ({
      clientId: client.id,
      clientName: client.name,
      missingWeekly: client.reports.length === 0,
      missingMonthly: !monthlyReportClientIds.has(client.id),
    }))
    .filter((a) => a.missingWeekly || a.missingMonthly)
    .slice(0, 10);

  // Summary counts
  const [clientCount, taskCount] = await Promise.all([
    prisma.client.count({ where: { active: true } }),
    isPrivileged
      ? prisma.task.count({ where: { status: { notIn: ["DONE"] } } })
      : prisma.task.count({ where: { assigneeId: userId, status: { notIn: ["DONE"] } } }),
  ]);

  const stats = [
    { label: "Clientes", value: isPrivileged ? String(clientCount) : "—", href: "/dashboard/clients" },
    { label: "Tarefas Abertas", value: String(taskCount), href: "/dashboard/tasks" },
    { label: "Relatórios", value: "—", href: "/dashboard" },
    { label: "Gestores", value: "—", href: "/dashboard" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="font-bold uppercase text-[#e6efe8]"
          style={{ fontFamily: "var(--font-display)", fontSize: "36px", letterSpacing: "0.02em" }}
        >
          Dashboard
        </h1>
        <p className="text-[#6e7a70] text-sm mt-1">
          Bem-vindo, {session.user?.name}
        </p>
      </div>

      {/* Zero Spend Alert — only for OWNER/COORDINATOR */}
      {isPrivileged && <ZeroSpendAlert />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border border-[#1f2a23] rounded-[10px] p-4 hover:border-[#28342a] transition-colors"
            style={{ background: "linear-gradient(180deg, #141f18 0%, #111a14 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#182219] rounded-md">
                <LayoutDashboard className="w-4 h-4 text-[#6e7a70]" />
              </div>
              <div>
                <p
                  className="text-xs uppercase tracking-wider text-[#6e7a70]"
                >{stat.label}</p>
                <p
                  className="text-xl font-semibold text-[#e6efe8]"
                  style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
                >{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Minhas Tarefas Pendentes */}
      <div className="bg-[#141f18] border border-[#1f2a23] rounded-[10px] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#e6efe8] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#e8a73a]" />
            Minhas Tarefas Pendentes
          </h2>
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1 text-xs text-[#6e7a70] hover:text-[#e6efe8] transition-colors"
          >
            Ver todas
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pendingTasks.length === 0 ? (
          <p className="text-sm text-[#4a5450] text-center py-4">
            Nenhuma tarefa pendente atribuída a você
          </p>
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== "DONE";

              return (
                <Link
                  key={task.id}
                  href="/dashboard/tasks"
                  className="flex items-center gap-3 p-3 bg-[#182219] hover:bg-[#1f2a23] border border-[#1f2a23] hover:border-[#28342a] rounded-lg transition-all group"
                >
                  <span
                    className={cn(
                      "inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0",
                      PRIORITY_COLORS[task.priority]
                    )}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>

                  <span className="flex-1 text-sm text-[#e6efe8] truncate">
                    {task.title}
                  </span>

                  {task.client && (
                    <span className="text-xs text-[#6e7a70] truncate max-w-[120px] flex-shrink-0">
                      {task.client.name}
                    </span>
                  )}

                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-xs flex-shrink-0",
                        isOverdue ? "text-[#d85a4a] font-medium" : "text-[#6e7a70]"
                      )}
                    >
                      {isOverdue ? "Vencida · " : ""}{formatBRTDate(task.dueDate)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Acesso Rápido */}
      <div className="bg-[#141f18] border border-[#1f2a23] rounded-[10px] p-6">
        <h2 className="text-sm font-bold text-[#e6efe8] mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Overview", href: "/dashboard/overview", icon: BarChart3 },
            { label: "Metas", href: "/dashboard/metas", icon: Target },
            { label: "PIX", href: "/dashboard/pix", icon: DollarSign },
            { label: "Calculadora", href: "/dashboard/calculadoras/investimento", icon: Calculator },
            { label: "HUB de Dados", href: "/dashboard/dash", icon: Database },
          ].map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 bg-[#182219] hover:bg-[#1f2a23] border border-[#1f2a23] hover:border-[#28342a] rounded-lg transition-all group text-center"
            >
              <div className="p-2 rounded-md transition-colors" style={{ background: "rgba(125,193,40,0.1)" }}>
                <Icon className="w-4 h-4 text-[#7DC128]" />
              </div>
              <span className="text-xs text-[#a8b3aa] group-hover:text-[#e6efe8] transition-colors font-medium">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Alertas de Relatório */}
      {reportAlerts.length > 0 && (
        <div className="bg-[#141f18] border border-[#1f2a23] rounded-[10px] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#e6efe8] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#e8a73a]" />
              Alertas de Relatório
            </h2>
            <span className="text-xs text-[#6e7a70]">{reportAlerts.length} cliente(s)</span>
          </div>

          <div className="space-y-2">
            {reportAlerts.map((alert) => (
              <div
                key={alert.clientId}
                className="flex items-center gap-3 p-3 bg-[#182219] border border-[#1f2a23] rounded-lg"
              >
                <span className="flex-1 text-sm text-[#e6efe8] truncate">{alert.clientName}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {alert.missingWeekly && (
                    <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded border bg-[rgba(232,167,58,0.12)] text-[#e8a73a] border-[rgba(232,167,58,0.2)] font-medium">
                      Sem semanal
                    </span>
                  )}
                  {alert.missingMonthly && (
                    <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded border bg-[rgba(216,90,74,0.12)] text-[#d85a4a] border-[rgba(216,90,74,0.2)] font-medium">
                      Sem mensal
                    </span>
                  )}
                  <Link
                    href={`/dashboard/clients/${alert.clientId}`}
                    className="flex items-center gap-1 text-xs text-[#6e7a70] hover:text-[#e6efe8] transition-colors"
                  >
                    Gerar
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
