import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = await prisma.client.findUnique({
    where: { id },
    select: { active: true, name: true },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const updated = await prisma.client.update({
    where: { id },
    data: {
      active: !client.active,
      archivedAt: client.active ? new Date() : null,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: updated.active ? "UNARCHIVE" : "ARCHIVE",
    entityType: "Client",
    entityId: id,
    metadata: { name: client.name },
  });

  return NextResponse.json(updated);
}
