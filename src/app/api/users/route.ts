import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as Role | null;

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
