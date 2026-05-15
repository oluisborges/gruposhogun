import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { nowBRT } from "@/lib/date-utils";
import { MetasBoard } from "@/components/metas/metas-board";
import type { Role } from "@prisma/client";

export default async function MetasPage() {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;

  const now = nowBRT();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isPrivileged = userRole === "OWNER" || userRole === "COORDINATOR";

  let clientIds: string[] | undefined;
  if (!isPrivileged) {
    const managed = await prisma.clientManager.findMany({
      where: { userId },
      select: { clientId: true },
    });
    clientIds = managed.map((m) => m.clientId);
  }

  const clients = await prisma.client.findMany({
    where: {
      active: true,
      ...(clientIds ? { id: { in: clientIds } } : {}),
    },
    select: { id: true, name: true, tag: true },
    orderBy: { name: "asc" },
  });

  const goals = await prisma.monthlyGoal.findMany({
    where: {
      year: currentYear,
      month: currentMonth,
      ...(clientIds ? { clientId: { in: clientIds } } : {}),
    },
    include: {
      client: { select: { id: true, name: true, tag: true } },
    },
  });

  return (
    <MetasBoard
      clients={clients}
      goals={goals}
      currentUser={{ id: userId, role: userRole }}
      defaultYear={currentYear}
      defaultMonth={currentMonth}
    />
  );
}
