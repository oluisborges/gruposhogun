import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attachments = await prisma.clientAttachment.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    name: string;
    url: string;
    type: "link" | "note";
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const attachment = await prisma.clientAttachment.create({
    data: {
      clientId: id,
      name: body.name.trim(),
      url: body.url ?? "",
      type: body.type ?? "link",
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "CREATE_ATTACHMENT",
    entityType: "ClientAttachment",
    entityId: attachment.id,
    metadata: { clientId: id, name: attachment.name, type: attachment.type },
  });

  return NextResponse.json(attachment, { status: 201 });
}
