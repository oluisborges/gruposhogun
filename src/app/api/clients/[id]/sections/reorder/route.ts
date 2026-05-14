import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { sections: { id: string; order: number }[] };

  await Promise.all(
    body.sections.map(({ id: sectionId, order }) =>
      prisma.clientSection.update({
        where: { id: sectionId, clientId: id },
        data: { order },
      })
    )
  );

  return NextResponse.json({ success: true });
}
