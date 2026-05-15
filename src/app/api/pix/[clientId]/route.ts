import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { currentPixWeekStart, nowBRT } from "@/lib/date-utils";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const weekOf = currentPixWeekStart();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findUnique({
      where: { clientId_userId: { clientId, userId: user.id } },
    });
    if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.pixWeeklyRecord.findUnique({
    where: { clientId_weekOf: { clientId, weekOf } },
  });

  if (existing && existing.sentAt) {
    // Toggle off: clear sentAt and sentById
    const updated = await prisma.pixWeeklyRecord.update({
      where: { id: existing.id },
      data: { sentAt: null, sentById: null },
      include: { sentBy: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  }

  // Toggle on: set sentAt and sentById
  const record = await prisma.pixWeeklyRecord.upsert({
    where: { clientId_weekOf: { clientId, weekOf } },
    update: { sentAt: nowBRT(), sentById: user.id },
    create: { clientId, weekOf, sentAt: nowBRT(), sentById: user.id },
    include: { sentBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record);
}
