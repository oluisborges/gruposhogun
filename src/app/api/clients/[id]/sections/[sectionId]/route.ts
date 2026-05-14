import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, sectionId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { title?: string; content?: string };

  const section = await prisma.clientSection.update({
    where: { id: sectionId, clientId: id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE_SECTION",
    entityType: "ClientSection",
    entityId: sectionId,
    metadata: { clientId: id },
  });

  return NextResponse.json(section);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, sectionId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.clientSection.delete({
    where: { id: sectionId, clientId: id },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "DELETE_SECTION",
    entityType: "ClientSection",
    entityId: sectionId,
    metadata: { clientId: id },
  });

  return NextResponse.json({ success: true });
}
