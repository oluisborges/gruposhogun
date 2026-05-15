import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { OverviewTable } from "@/components/overview/overview-table";
import type { Role, ClientTag } from "@prisma/client";
import type { OverviewRow } from "@/components/overview/overview-table";
import type { MetaInsights } from "@/lib/meta-ads/client";

export default async function OverviewPage() {
  const session = await requireAuth();
  const userRole = session.user?.role as Role;
  const userId = session.user?.id as string;
  const userName = session.user?.name as string;
  const userEmail = session.user?.email as string;

  // Filter clients by role
  let clientFilter = {};
  if (userRole === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId },
      select: { clientId: true },
    });
    clientFilter = { id: { in: managed.map((m) => m.clientId) } };
  }

  const clients = await prisma.client.findMany({
    where: { active: true, ...clientFilter },
    include: {
      managers: {
        include: { user: { select: { name: true } } },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
          rawData: true,
        },
      },
      monthlyGoals: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const rows: OverviewRow[] = clients.map((client) => {
    const lastReport = client.reports[0] ?? null;
    const rawData = lastReport?.rawData as {
      current?: Partial<MetaInsights>;
    } | null;

    const latestGoal = client.monthlyGoals[0] ?? null;

    return {
      clientId: client.id,
      clientName: client.name,
      tag: client.tag as ClientTag,
      managerNames: client.managers.map((m) => m.user.name),
      lastReportDate: lastReport ? lastReport.createdAt.toISOString() : null,
      metrics: rawData?.current ?? null,
      goal: latestGoal
        ? (() => {
            const weeks = latestGoal.weeks as Array<{
              spend?: number;
              roas?: number;
              cpa?: number;
            }>;
            if (!weeks || weeks.length === 0) return null;
            // Average across weeks or use first
            const firstWeek = weeks[0];
            return {
              spend: firstWeek?.spend,
              roas: firstWeek?.roas,
              cpa: firstWeek?.cpa,
            };
          })()
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview de Clientes</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Metricas consolidadas de todos os clientes ativos
        </p>
      </div>

      <OverviewTable
        rows={rows}
        currentUser={{
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole,
          tags: [],
          active: true,
        }}
      />
    </div>
  );
}
