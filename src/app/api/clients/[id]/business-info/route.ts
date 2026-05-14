import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    description?: string;
    notes?: string;
    horario?: string;
    ticketMedio?: string;
    regiao?: string;
    observacoes?: string;
  };

  const existing = await prisma.client.findUnique({
    where: { id },
    select: { businessInfo: true },
  });

  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const currentInfo = (existing.businessInfo ?? {}) as Record<string, unknown>;

  const updated = await prisma.client.update({
    where: { id },
    data: {
      businessInfo: { ...currentInfo, ...body },
    },
    select: { id: true, businessInfo: true },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE_BUSINESS_INFO",
    entityType: "Client",
    entityId: id,
    metadata: { fields: Object.keys(body) },
  });

  return NextResponse.json(updated);
}
