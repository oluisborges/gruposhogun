import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface WeekGoal {
  week: 1 | 2 | 3 | 4 | 5;
  goal: number;
  traffic?: number;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;

  let clientIds: string[] | undefined;
  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    clientIds = managed.map((m) => m.clientId);
  }

  const goals = await prisma.monthlyGoal.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(clientIds ? { clientId: { in: clientIds } } : {}),
      ...(year ? { year } : {}),
      ...(month ? { month } : {}),
    },
    include: {
      client: { select: { id: true, name: true, tag: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { clientId: string; year: number; month: number; weeks: WeekGoal[] };
  const { clientId, year, month, weeks } = body;

  if (!clientId || !year || !month) {
    return NextResponse.json({ error: "clientId, year e month são obrigatórios" }, { status: 400 });
  }

  const goal = await prisma.monthlyGoal.upsert({
    where: { clientId_year_month: { clientId, year, month } },
    update: { weeks: weeks as unknown as import("@prisma/client").Prisma.InputJsonValue },
    create: {
      clientId,
      year,
      month,
      weeks: weeks as unknown as import("@prisma/client").Prisma.InputJsonValue,
    },
    include: {
      client: { select: { id: true, name: true, tag: true } },
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
