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

  const sections = await prisma.clientSection.findMany({
    where: { clientId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(sections);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { title: string; content?: string };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  const maxOrder = await prisma.clientSection.aggregate({
    where: { clientId: id },
    _max: { order: true },
  });

  const section = await prisma.clientSection.create({
    data: {
      clientId: id,
      title: body.title.trim(),
      content: body.content,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "CREATE_SECTION",
    entityType: "ClientSection",
    entityId: section.id,
    metadata: { clientId: id, title: section.title },
  });

  return NextResponse.json(section, { status: 201 });
}
