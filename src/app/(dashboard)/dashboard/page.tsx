import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { nowBRT } from "@/lib/date-utils";
import { LayoutDashboard, AlertCircle, ArrowRight, Bell } from "lucide-react";
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
  LOW: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
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
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 text-sm mt-1">
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
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-md">
                <LayoutDashboard className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">{stat.label}</p>
                <p className="text-xl font-semibold text-white">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Minhas Tarefas Pendentes */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            Minhas Tarefas Pendentes
          </h2>
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Ver todas
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pendingTasks.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-4">
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
                  className="flex items-center gap-3 p-3 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-all group"
                >
                  <span
                    className={cn(
                      "inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0",
                      PRIORITY_COLORS[task.priority]
                    )}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>

                  <span className="flex-1 text-sm text-white truncate group-hover:text-neutral-100">
                    {task.title}
                  </span>

                  {task.client && (
                    <span className="text-xs text-neutral-500 truncate max-w-[120px] flex-shrink-0">
                      {task.client.name}
                    </span>
                  )}

                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-xs flex-shrink-0",
                        isOverdue ? "text-red-400 font-medium" : "text-neutral-500"
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

      {/* Alertas de Relatório */}
      {reportAlerts.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" />
              Alertas de Relatório
            </h2>
            <span className="text-xs text-neutral-500">{reportAlerts.length} cliente(s)</span>
          </div>

          <div className="space-y-2">
            {reportAlerts.map((alert) => (
              <div
                key={alert.clientId}
                className="flex items-center gap-3 p-3 bg-neutral-800 border border-neutral-700 rounded-lg"
              >
                <span className="flex-1 text-sm text-white truncate">{alert.clientName}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {alert.missingWeekly && (
                    <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 font-medium">
                      Sem semanal
                    </span>
                  )}
                  {alert.missingMonthly && (
                    <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded border bg-orange-500/10 text-orange-400 border-orange-500/20 font-medium">
                      Sem mensal
                    </span>
                  )}
                  <Link
                    href={`/dashboard/clients/${alert.clientId}`}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors"
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
