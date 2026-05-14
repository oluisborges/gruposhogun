import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ClientsTable } from "@/components/clients/clients-table";
import type { Role } from "@prisma/client";

export default async function ClientsPage() {
  const session = await requireAuth();
  const userRole = session.user.role as Role;
  const userId = session.user.id as string;

  const isManager = userRole === "MANAGER";

  const clients = await prisma.client.findMany({
    where: isManager
      ? { managers: { some: { userId } } }
      : {},
    include: {
      managers: { include: { user: true } },
      metaAccounts: true,
      _count: { select: { reports: true, tasks: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Gerencie os clientes da agência
          </p>
        </div>
      </div>
      <ClientsTable
        clients={clients}
        userRole={userRole}
        userId={userId}
      />
    </div>
  );
}
