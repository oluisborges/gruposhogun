import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { currentPixWeekStart } from "@/lib/date-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekOf = currentPixWeekStart();

  let clientIds: string[] | undefined;
  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId: user.id },
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

  const items = clients.map((client) => ({
    client,
    record: recordMap.get(client.id) ?? null,
  }));

  return NextResponse.json(items);
}
