import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { userId: string };

  if (!body.userId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.clientManager.findUnique({
    where: { clientId_userId: { clientId: id, userId: body.userId } },
  });

  if (existing) {
    return NextResponse.json({ error: "Gestor já atribuído" }, { status: 409 });
  }

  const manager = await prisma.clientManager.create({
    data: { clientId: id, userId: body.userId },
    include: { user: true },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "ADD_MANAGER",
    entityType: "ClientManager",
    entityId: id,
    metadata: { managerId: body.userId },
  });

  return NextResponse.json(manager, { status: 201 });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { userId: string };

  if (!body.userId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
  }

  await prisma.clientManager.delete({
    where: { clientId_userId: { clientId: id, userId: body.userId } },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "REMOVE_MANAGER",
    entityType: "ClientManager",
    entityId: id,
    metadata: { managerId: body.userId },
  });

  return NextResponse.json({ success: true });
}
