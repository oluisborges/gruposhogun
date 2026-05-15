import Link from "next/link";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { nowBRT, formatBRTDate } from "@/lib/date-utils";
import { formatBRL } from "@/lib/formatting";
import { ZeroSpendAlert } from "@/components/dashboard/zero-spend-alert";
import {
  Users, CheckSquare, FileText, TrendingUp, ArrowRight,
  Bell, Plus, Zap, AlertTriangle, CheckCircle2, Calendar,
} from "lucide-react";
import type { Role, TaskPriority } from "@prisma/client";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente",
};
const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "bg-[rgba(125,193,40,0.1)] text-[#7DC128]",
  MEDIUM: "bg-[rgba(232,167,58,0.1)] text-[#e8a73a]",
  HIGH: "bg-[rgba(216,90,74,0.1)] text-[#d85a4a]",
  URGENT: "bg-[rgba(216,90,74,0.18)] text-[#d85a4a]",
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;
  const isPrivileged = userRole === "OWNER" || userRole === "COORDINATOR";

  const now = nowBRT();

  // Week bounds (Sun 20h BRT)
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(20, 0, 0, 0);
  if (now < weekStart) weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Parallel data fetching
  const [pendingTasks, clientCount, taskCount, reportCount, userCount, recentReports] =
    await Promise.all([
      // Top 5 pending tasks for user
      prisma.task.findMany({
        where: { assigneeId: userId, status: { notIn: ["DONE"] } },
        include: { client: { select: { id: true, name: true } } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 6,
      }),
      // Client count
      isPrivileged
        ? prisma.client.count({ where: { active: true } })
        : prisma.clientManager.count({ where: { userId } }),
      // Task count
      isPrivileged
        ? prisma.task.count({ where: { status: { notIn: ["DONE"] } } })
        : prisma.task.count({ where: { assigneeId: userId, status: { notIn: ["DONE"] } } }),
      // Report count this month
      prisma.report.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
      // User count (privileged only)
      isPrivileged ? prisma.user.count({ where: { active: true } }) : Promise.resolve(0),
      // Recent reports
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { client: { select: { name: true } }, generatedBy: { select: { name: true } } },
      }),
    ]);

  // Report alerts
  const alertClients = await prisma.client.findMany({
    where: {
      active: true,
      ...(isPrivileged ? {} : { managers: { some: { userId } } }),
    },
    select: {
      id: true, name: true, tag: true,
      reports: { where: { createdAt: { gte: weekStart, lte: weekEnd } }, select: { id: true } },
    },
    take: 20,
  });

  const monthlyDone = await prisma.report.findMany({
    where: { clientId: { in: alertClients.map((c) => c.id) }, createdAt: { gte: monthStart, lte: monthEnd } },
    select: { clientId: true },
  }).then((rs) => new Set(rs.map((r) => r.clientId)));

  const reportAlerts = alertClients
    .map((c) => ({ ...c, missingWeekly: c.reports.length === 0, missingMonthly: !monthlyDone.has(c.id) }))
    .filter((a) => a.missingWeekly || a.missingMonthly)
    .slice(0, 8);

  const urgentCount = pendingTasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length;
  const overdueCount = pendingTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
  ).length;

  const TAG_COLOR: Record<string, string> = {
    MARMITARIA: "bg-[rgba(232,167,58,0.1)] text-[#e8a73a]",
    DELIVERY: "bg-[rgba(216,90,74,0.1)] text-[#d85a4a]",
    GENERICA: "bg-[#182219] text-[#6e7a70]",
  };

  const monthName = now.toLocaleDateString("pt-BR", { month: "long" });
  const year = now.getFullYear();

  return (
    <div className="flex flex-col min-h-full">

      {/* ── TOPBAR ── */}
      <div
        className="flex-shrink-0 flex items-center gap-5 px-7 sticky top-0 z-10"
        style={{ height: 64, borderBottom: "1px solid #1f2a23", background: "rgba(13,20,16,0.85)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2" style={{ fontSize: 13, color: "#a8b3aa" }}>
          <span style={{ color: "#6e7a70" }}>Operação</span>
          <span style={{ color: "#4a5450" }}>/</span>
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>Dashboard</span>
        </div>

        <div
          className="flex items-center gap-2 flex-1 max-w-md ml-6"
          style={{ background: "#0f1813", border: "1px solid #1f2a23", borderRadius: 8, padding: "9px 14px", color: "#6e7a70", fontSize: 13 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <span style={{ color: "#4a5450" }}>Buscar clientes, tarefas, campanhas…</span>
          <span
            className="ml-auto"
            style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "#6e7a70", border: "1px solid #28342a", padding: "2px 6px", borderRadius: 4 }}
          >⌘ K</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {reportAlerts.length > 0 && (
            <div className="relative">
              <button
                className="flex items-center justify-center transition-colors"
                style={{ width: 38, height: 38, borderRadius: 8, border: "1px solid #1f2a23", color: "#a8b3aa", background: "#0f1813" }}
              >
                <Bell style={{ width: 16, height: 16 }} />
              </button>
              <span
                className="absolute"
                style={{ top: 9, right: 10, width: 7, height: 7, borderRadius: "50%", background: "#7DC128", boxShadow: "0 0 0 2px #0f1813" }}
              />
            </div>
          )}
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 font-bold transition-colors"
            style={{ background: "#7DC128", color: "#0a1408", fontSize: 13, padding: "9px 14px", borderRadius: 8 }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Novo cliente
          </Link>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 p-7 flex flex-col gap-6 max-w-[1640px]">

        {/* Page head */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1
              className="uppercase text-[#e6efe8] leading-none"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 36, letterSpacing: ".02em" }}
            >
              Visão geral · {monthName.charAt(0).toUpperCase() + monthName.slice(1)} / {year}
            </h1>
            <p className="mt-2" style={{ color: "#6e7a70", fontSize: 13.5 }}>
              Olá{" "}
              <span style={{ color: "#e6efe8" }}>{session.user?.name?.split(" ")[0]}</span>
              {urgentCount > 0 && (
                <>, você tem{" "}
                  <span style={{ color: "#7DC128", fontWeight: 700 }}>{urgentCount} {urgentCount === 1 ? "tarefa urgente" : "tarefas urgentes"}</span>
                </>
              )}
              {reportAlerts.length > 0 && (
                <> e{" "}
                  <span style={{ color: "#e8a73a", fontWeight: 700 }}>{reportAlerts.length} {reportAlerts.length === 1 ? "cliente" : "clientes"}</span>
                  {" "}sem relatório
                </>
              )}
              .
            </p>
          </div>
        </div>

        {/* Zero Spend */}
        {isPrivileged && <ZeroSpendAlert />}

        {/* ── KPI CARDS ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            {
              label: "Clientes ativos",
              value: clientCount,
              unit: "contas",
              icon: Users,
              href: "/dashboard/clients",
              delta: null,
            },
            {
              label: "Tarefas abertas",
              value: taskCount,
              unit: null,
              icon: CheckSquare,
              href: "/dashboard/tasks",
              delta: urgentCount > 0 ? `${urgentCount} urgente${urgentCount > 1 ? "s" : ""}` : null,
              deltaColor: "#e8a73a",
            },
            {
              label: "Relatórios no mês",
              value: reportCount,
              unit: null,
              icon: FileText,
              href: "/dashboard/graficos",
              delta: reportAlerts.length > 0 ? `${reportAlerts.length} pendente${reportAlerts.length > 1 ? "s" : ""}` : "Em dia",
              deltaColor: reportAlerts.length > 0 ? "#e8a73a" : "#7DC128",
            },
            {
              label: isPrivileged ? "Gestores ativos" : "Suas contas",
              value: isPrivileged ? userCount : clientCount,
              unit: null,
              icon: TrendingUp,
              href: isPrivileged ? "/dashboard/users" : "/dashboard/overview",
              delta: null,
            },
          ].map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="flex flex-col gap-3 relative overflow-hidden transition-all hover:border-[#28342a]"
              style={{ background: "linear-gradient(180deg, #141f18 0%, #111a14 100%)", border: "1px solid #1f2a23", borderRadius: 10, padding: "18px 20px" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="uppercase"
                  style={{ fontSize: 12, color: "#6e7a70", letterSpacing: ".12em", fontWeight: 600 }}
                >
                  {kpi.label}
                </span>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(125,193,40,0.12)", color: "#7DC128" }}
                >
                  <kpi.icon style={{ width: 18, height: 18 }} />
                </div>
              </div>
              <div
                className="leading-none"
                style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 700, letterSpacing: ".01em", color: "#e6efe8" }}
              >
                {kpi.value}
                {kpi.unit && (
                  <span style={{ fontSize: 14, color: "#6e7a70", marginLeft: 6, fontWeight: 600 }}>{kpi.unit}</span>
                )}
              </div>
              {kpi.delta && (
                <div style={{ fontSize: 12, color: kpi.deltaColor ?? "#6e7a70", fontWeight: 700 }}>
                  {kpi.delta}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* ── ROW 1: TASKS + ALERTS ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1.6fr 1fr" }}>

          {/* Tasks card */}
          <section
            className="flex flex-col gap-4"
            style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-[#e6efe8]" style={{ fontSize: 15 }}>Tarefas pendentes</p>
                <p style={{ fontSize: 12, color: "#6e7a70", marginTop: 3 }}>
                  {overdueCount > 0 ? `${overdueCount} vencida${overdueCount > 1 ? "s" : ""}` : "Suas tarefas abertas"}
                </p>
              </div>
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-1 font-semibold transition-colors hover:text-[#9be03a]"
                style={{ fontSize: 12, color: "#7DC128" }}
              >
                Ver kanban <ArrowRight style={{ width: 13, height: 13 }} />
              </Link>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle2 style={{ width: 32, height: 32, color: "#7DC128", opacity: .5 }} />
                <p style={{ fontSize: 13, color: "#4a5450" }}>Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div>
                {pendingTasks.map((task, i) => {
                  const overdue = task.dueDate && new Date(task.dueDate) < now;
                  return (
                    <div
                      key={task.id}
                      className="grid items-center gap-4"
                      style={{
                        gridTemplateColumns: "auto 1fr auto",
                        padding: "12px 4px",
                        borderBottom: i < pendingTasks.length - 1 ? "1px dashed #1f2a23" : undefined,
                      }}
                    >
                      <div
                        className="flex-shrink-0"
                        style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid #4a5450", cursor: "pointer" }}
                      />
                      <div>
                        <p className="font-semibold text-[#e6efe8] truncate" style={{ fontSize: 13.5 }}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11.5, color: "#6e7a70" }}>
                          {task.client && <span>{task.client.name}</span>}
                          {task.client && task.dueDate && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#4a5450", display: "inline-block" }} />}
                          {task.dueDate && (
                            <span style={{ color: overdue ? "#d85a4a" : "#6e7a70" }}>
                              {overdue ? "Vencida · " : ""}{formatBRTDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="uppercase flex-shrink-0"
                        style={{
                          ...{ fontSize: "10.5px", fontWeight: 700, letterSpacing: ".06em", padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" },
                          ...(task.priority === "URGENT" ? { background: "rgba(216,90,74,0.12)", color: "#d85a4a" }
                            : task.priority === "HIGH" ? { background: "rgba(232,167,58,0.12)", color: "#e8a73a" }
                            : task.priority === "MEDIUM" ? { background: "rgba(128,128,128,0.15)", color: "#bbb" }
                            : { background: "rgba(125,193,40,0.1)", color: "#7DC128" }),
                        }}
                      >
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right col */}
          <div className="flex flex-col gap-4">

            {/* Report alerts */}
            <section
              className="flex flex-col gap-4 flex-1"
              style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[#e6efe8]" style={{ fontSize: 15 }}>Alertas de relatório</p>
                  <p style={{ fontSize: 12, color: "#6e7a70", marginTop: 3 }}>
                    Clientes sem relatório no ciclo atual
                  </p>
                </div>
                {reportAlerts.length > 0 && (
                  <span
                    className="flex-shrink-0"
                    style={{ fontSize: 11, color: "#e8a73a", fontWeight: 700, background: "rgba(232,167,58,0.12)", padding: "2px 8px", borderRadius: 20 }}
                  >
                    {reportAlerts.length}
                  </span>
                )}
              </div>

              {reportAlerts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <CheckCircle2 style={{ width: 28, height: 28, color: "#7DC128", opacity: .5 }} />
                  <p style={{ fontSize: 12, color: "#4a5450" }}>Todos os relatórios em dia</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0">
                  {reportAlerts.slice(0, 5).map((alert, i) => (
                    <div
                      key={alert.id}
                      className="flex items-center gap-3"
                      style={{ padding: "10px 4px", borderBottom: i < Math.min(reportAlerts.length, 5) - 1 ? "1px dashed #1f2a23" : undefined }}
                    >
                      <div
                        className="flex-shrink-0 flex items-center justify-center font-bold"
                        style={{ width: 28, height: 28, borderRadius: 6, background: "#182219", fontSize: 10, color: "#7DC128", fontFamily: "var(--font-display)", letterSpacing: ".05em" }}
                      >
                        {alert.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#e6efe8] font-semibold truncate" style={{ fontSize: 12.5 }}>{alert.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {alert.missingWeekly && (
                            <span style={{ fontSize: 10, background: "rgba(232,167,58,0.1)", color: "#e8a73a", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>semanal</span>
                          )}
                          {alert.missingMonthly && (
                            <span style={{ fontSize: 10, background: "rgba(216,90,74,0.1)", color: "#d85a4a", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>mensal</span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/clients/${alert.id}`}
                        className="flex-shrink-0 transition-colors hover:text-[#e6efe8]"
                        style={{ fontSize: 11, color: "#7DC128", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}
                      >
                        Gerar <ArrowRight style={{ width: 11, height: 11 }} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick access */}
            <section
              style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}
            >
              <p className="font-bold text-[#e6efe8] mb-3" style={{ fontSize: 15 }}>Acesso rápido</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                {[
                  { label: "Overview",     href: "/dashboard/overview",                       icon: "📊" },
                  { label: "Metas",        href: "/dashboard/metas",                          icon: "🎯" },
                  { label: "PIX",          href: "/dashboard/pix",                            icon: "💵" },
                  { label: "Calculadora",  href: "/dashboard/calculadoras/investimento",      icon: "🧮" },
                  { label: "HUB Dados",    href: "/dashboard/dash",                           icon: "🗄️" },
                  { label: "Ranking",      href: "/dashboard/ranking",                        icon: "🏆" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col gap-1 transition-colors rounded-[8px] p-3 border border-[#1f2a23] bg-[#0f1813] hover:border-[#2a583e] hover:bg-[#101e15]"
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span className="font-bold text-[#e6efe8]" style={{ fontSize: 12.5 }}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── ROW 2: RECENT REPORTS + ACTIVITY ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1.7fr 1fr" }}>

          {/* Recent reports table */}
          <section
            style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-bold text-[#e6efe8]" style={{ fontSize: 15 }}>Relatórios recentes</p>
                <p style={{ fontSize: 12, color: "#6e7a70", marginTop: 3 }}>Últimos gerados pela equipe</p>
              </div>
              <Link
                href="/dashboard/graficos"
                className="flex items-center gap-1 font-semibold transition-colors hover:text-[#9be03a]"
                style={{ fontSize: 12, color: "#7DC128" }}
              >
                Ver histórico <ArrowRight style={{ width: 13, height: 13 }} />
              </Link>
            </div>

            {recentReports.length === 0 ? (
              <p style={{ fontSize: 13, color: "#4a5450", textAlign: "center", padding: "24px 0" }}>
                Nenhum relatório gerado ainda
              </p>
            ) : (
              <>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1.4fr 1fr 1fr 0.7fr", gap: 12, padding: "0 4px 10px", borderBottom: "1px solid #1f2a23", fontSize: 11, color: "#6e7a70", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}
                >
                  <span>Cliente</span>
                  <span>Tipo</span>
                  <span>Gerado por</span>
                  <span>Data</span>
                </div>
                {recentReports.map((report, i) => {
                  const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
                    WEEKLY: { bg: "rgba(125,193,40,0.1)", color: "#7DC128", label: "Semanal" },
                    MONTHLY: { bg: "rgba(125,193,40,0.15)", color: "#9be03a", label: "Mensal" },
                    CUSTOM: { bg: "rgba(232,167,58,0.1)", color: "#e8a73a", label: "Custom" },
                  };
                  const t = TYPE_STYLE[report.type] ?? TYPE_STYLE.CUSTOM;
                  return (
                    <div
                      key={report.id}
                      className="grid items-center"
                      style={{ gridTemplateColumns: "1.4fr 1fr 1fr 0.7fr", gap: 12, padding: "11px 4px", borderBottom: i < recentReports.length - 1 ? "1px dashed #1f2a23" : undefined, fontSize: 12.5 }}
                    >
                      <span className="text-[#e6efe8] font-semibold truncate">{report.client.name}</span>
                      <span>
                        <span style={{ background: t.bg, color: t.color, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {t.label}
                        </span>
                      </span>
                      <span className="text-[#a8b3aa] truncate">{report.generatedBy.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6e7a70" }}>
                        {formatBRTDate(report.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </section>

          {/* Activity timeline */}
          <section
            style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="font-bold text-[#e6efe8]" style={{ fontSize: 15 }}>Atividade recente</p>
                <p style={{ fontSize: 12, color: "#6e7a70", marginTop: 3 }}>Ações do sistema</p>
              </div>
            </div>

            <div className="relative flex flex-col">
              {[
                { icon: <CheckCircle2 style={{ width: 12, height: 12 }} />, color: "#7DC128", text: "Sistema inicializado com sucesso", time: "agora", sub: "banco · migrations" },
                { icon: <Zap style={{ width: 12, height: 12 }} />, color: "#e8a73a", text: "Configurações de autenticação ativas", time: "início", sub: "NextAuth v5" },
                { icon: <AlertTriangle style={{ width: 12, height: 12 }} />, color: "#d85a4a", text: "Conecte a Meta API para métricas em tempo real", time: "pendente", sub: "Fase 5" },
                { icon: <Calendar style={{ width: 12, height: 12 }} />, color: "#7DC128", text: "Crons de zero-spend configurados", time: "pronto", sub: "Vercel · 2×/dia" },
              ].map((item, i, arr) => (
                <div key={i} className="grid gap-3 relative" style={{ gridTemplateColumns: "24px 1fr", padding: "12px 0" }}>
                  {i < arr.length - 1 && (
                    <span className="absolute" style={{ left: 11, top: 28, bottom: -12, width: 1, background: "#1f2a23" }} />
                  )}
                  <div
                    className="flex items-center justify-center z-10"
                    style={{ width: 24, height: 24, borderRadius: "50%", background: "#101a14", border: "1px solid #28342a", color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: "#a8b3aa", lineHeight: 1.4 }}>{item.text}</p>
                    <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11.5, color: "#6e7a70" }}>
                      <span>{item.time}</span>
                      <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#4a5450", display: "inline-block" }} />
                      <span>{item.sub}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
