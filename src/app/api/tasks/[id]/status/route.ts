import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { TaskStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "MANAGER" && existing.assigneeId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { status: TaskStatus };
  if (!body.status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json(task);
}
