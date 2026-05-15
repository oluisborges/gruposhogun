import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { GraficosBoard } from "@/components/graficos/graficos-board";
import type { Role, ClientTag } from "@prisma/client";
import type { MetaInsights } from "@/lib/meta-ads/client";

interface RawData {
  current?: Partial<MetaInsights>;
  period?: { since: string; until: string };
}

export default async function GraficosPage() {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;

  let clientFilter: { id?: { in: string[] } } = {};
  if (userRole === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId },
      select: { clientId: true },
    });
    clientFilter = { id: { in: managed.map((m) => m.clientId) } };
  }

  const clients = await prisma.client.findMany({
    where: { active: true, ...clientFilter },
    select: { id: true, name: true, tag: true },
    orderBy: { name: "asc" },
  });

  const clientIds = clients.map((c) => c.id);

  const reports = await prisma.report.findMany({
    where: { clientId: { in: clientIds } },
    select: {
      id: true,
      clientId: true,
      rawData: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const reportsWithMetrics = reports.map((r) => {
    const raw = r.rawData as RawData | null;
    const period = raw?.period;
    const client = clients.find((c) => c.id === r.clientId);

    return {
      id: r.id,
      clientId: r.clientId,
      clientName: client?.name ?? "",
      periodStart: period?.since ?? r.createdAt.toISOString().slice(0, 10),
      periodEnd: period?.until ?? r.createdAt.toISOString().slice(0, 10),
      metrics: raw?.current ?? {},
    };
  });

  return (
    <GraficosBoard
      reports={reportsWithMetrics}
      clients={clients as { id: string; name: string; tag: ClientTag }[]}
      currentUser={{ id: userId, role: userRole }}
    />
  );
}
