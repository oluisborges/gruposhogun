import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DataHub } from "@/components/dash/data-hub";
import { Database } from "lucide-react";
import type { Role } from "@prisma/client";

export default async function DashPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;

  const { clientId } = await searchParams;

  // Build client filter based on role
  const isPrivileged = userRole === "OWNER" || userRole === "COORDINATOR";

  if (!clientId) {
    // Show client selector
    let clients;
    if (isPrivileged) {
      clients = await prisma.client.findMany({
        where: { active: true },
        include: {
          metaAccounts: {
            where: { active: true },
            select: { id: true, accountName: true, accountId: true },
          },
        },
        orderBy: { name: "asc" },
      });
    } else {
      const managed = await prisma.clientManager.findMany({
        where: { userId },
        select: { clientId: true },
      });
      const ids = managed.map((m) => m.clientId);
      clients = await prisma.client.findMany({
        where: { active: true, id: { in: ids } },
        include: {
          metaAccounts: {
            where: { active: true },
            select: { id: true, accountName: true, accountId: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-500/10 rounded-md">
            <Database className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">HUB de Dados</h1>
            <p className="text-sm text-neutral-400">Selecione um cliente para visualizar os dados</p>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
            <p className="text-neutral-500 text-sm">Nenhum cliente disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/dash?clientId=${client.id}`}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 hover:border-neutral-700 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-red-400">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {client.metaAccounts.length} conta{client.metaAccounts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-neutral-100 truncate">
                  {client.name}
                </h3>
                {client.metaAccounts.length > 0 && (
                  <p className="text-xs text-neutral-500 mt-1 truncate">
                    {client.metaAccounts[0].accountName ?? client.metaAccounts[0].accountId}
                    {client.metaAccounts.length > 1 &&
                      ` +${client.metaAccounts.length - 1}`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Load client with accounts
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      metaAccounts: {
        where: { active: true },
        select: { id: true, accountName: true, accountId: true },
      },
    },
  });

  if (!client) {
    redirect("/dashboard/dash");
  }

  // Access check for managers
  if (!isPrivileged) {
    const managed = await prisma.clientManager.findFirst({
      where: { clientId, userId },
    });
    if (!managed) redirect("/dashboard/dash");
  }

  // Load recent reports for charts (last 8)
  const recentReports = await prisma.report.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      rawData: true,
      createdAt: true,
    },
  });

  const currentUser = {
    id: userId,
    role: userRole,
  };

  const clientData = {
    id: client.id,
    name: client.name,
    tag: client.tag,
    metaAccounts: client.metaAccounts,
  };

  return (
    <DataHub
      client={clientData}
      currentUser={currentUser}
      recentReports={recentReports.map((r) => ({
        id: r.id,
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
        rawData: r.rawData,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
