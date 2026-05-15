import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { clientId } = await params;
  const body = await req.json() as { pixValue: number };
  const { pixValue } = body;

  if (typeof pixValue !== "number" || isNaN(pixValue)) {
    return NextResponse.json({ error: "pixValue inválido" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { pixValue },
    select: { id: true, pixValue: true },
  });

  return NextResponse.json(updated);
}
