import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, attachmentId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.clientAttachment.delete({
    where: { id: attachmentId, clientId: id },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "DELETE_ATTACHMENT",
    entityType: "ClientAttachment",
    entityId: attachmentId,
    metadata: { clientId: id },
  });

  return NextResponse.json({ success: true });
}
