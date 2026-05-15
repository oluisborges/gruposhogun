import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  // MANAGER: only reports for their clients
  let clientIds: string[] | undefined;
  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    clientIds = managed.map((m) => m.clientId);
  }

  const reports = await prisma.report.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(clientIds ? { clientId: { in: clientIds } } : {}),
      ...(type ? { type: type as "WEEKLY" | "MONTHLY" | "CUSTOM" } : {}),
    },
    include: {
      client: { select: { name: true } },
      metaAccount: { select: { accountName: true } },
      generatedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(reports);
}
