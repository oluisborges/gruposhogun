import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface WeekGoal {
  week: 1 | 2 | 3 | 4 | 5;
  goal: number;
  traffic?: number;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as { weeks: WeekGoal[] };
  const { weeks } = body;

  const existing = await prisma.monthlyGoal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });

  const updated = await prisma.monthlyGoal.update({
    where: { id },
    data: { weeks: weeks as unknown as import("@prisma/client").Prisma.InputJsonValue },
    include: {
      client: { select: { id: true, name: true, tag: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const existing = await prisma.monthlyGoal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });

  await prisma.monthlyGoal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
