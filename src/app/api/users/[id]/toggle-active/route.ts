import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Apenas Owners podem ativar/desativar usuários" }, { status: 403 });
  }

  if (user.id === id) {
    return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, active: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { active: !target.active },
    select: { id: true, active: true },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: updated.active ? "RESTORE" : "ARCHIVE",
    entityType: "User",
    entityId: id,
    metadata: { name: target.name, active: updated.active },
  });

  return NextResponse.json(updated);
}
