import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { currentPixWeekStart, nowBRT, formatBRTDate } from "@/lib/date-utils";
import { PixBoard } from "@/components/pix/pix-board";
import type { Role } from "@prisma/client";

export default async function PixPage() {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;

  const weekOf = currentPixWeekStart();
  // Week end = weekOf + 6 days
  const weekEnd = new Date(weekOf);
  weekEnd.setDate(weekOf.getDate() + 6);

  let clientIds: string[] | undefined;
  if (userRole === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId },
      select: { clientId: true },
    });
    clientIds = managed.map((m) => m.clientId);
  }

  const clients = await prisma.client.findMany({
    where: {
      active: true,
      usesPix: true,
      ...(clientIds ? { id: { in: clientIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      tag: true,
      pixValue: true,
      metaAccounts: {
        where: { active: true },
        select: { billingUrl: true, accountId: true },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const records = await prisma.pixWeeklyRecord.findMany({
    where: {
      weekOf,
      clientId: { in: clients.map((c) => c.id) },
    },
    include: {
      sentBy: { select: { id: true, name: true } },
    },
  });

  const recordMap = new Map(records.map((r) => [r.clientId, r]));

  const items = clients.map((client) => {
    const record = recordMap.get(client.id) ?? null;
    return {
      client,
      record: record
        ? {
            id: record.id,
            sentAt: record.sentAt ? record.sentAt.toISOString() : null,
            sentById: record.sentById,
            sentBy: record.sentBy,
          }
        : null,
    };
  });

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh" }}>
      <PixBoard
        items={items}
        currentUser={{ id: userId, role: userRole }}
        weekStart={formatBRTDate(weekOf)}
        weekEnd={formatBRTDate(weekEnd)}
      />
    </div>
  );
}
