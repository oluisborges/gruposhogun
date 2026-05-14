import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { ClientTag } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      managers: { include: { user: true } },
      metaAccounts: true,
      reports: { orderBy: { createdAt: "desc" }, take: 10, include: { generatedBy: true } },
      customSections: { orderBy: { order: "asc" } },
      attachments: true,
      tasks: {
        include: {
          assignee: true,
          labels: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { reports: true, tasks: true } },
    },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  if (user.role === "MANAGER") {
    const manages = client.managers.some((m) => m.userId === user.id);
    if (!manages) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(client);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    name?: string;
    tag?: ClientTag;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    usesPix?: boolean;
    pixValue?: number;
    managerIds?: string[];
  };

  const { managerIds, ...clientData } = body;

  const updateData: Record<string, unknown> = { ...clientData };

  if (managerIds !== undefined) {
    await prisma.clientManager.deleteMany({ where: { clientId: id } });
    updateData.managers = {
      create: managerIds.map((userId) => ({ userId })),
    };
  }

  const client = await prisma.client.update({
    where: { id },
    data: updateData,
    include: {
      managers: { include: { user: true } },
      metaAccounts: true,
      _count: { select: { reports: true, tasks: true } },
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE",
    entityType: "Client",
    entityId: id,
    metadata: { fields: Object.keys(body) },
  });

  return NextResponse.json(client);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await prisma.client.delete({ where: { id } });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "DELETE",
    entityType: "Client",
    entityId: id,
    metadata: { name: client.name },
  });

  return NextResponse.json({ success: true });
}
