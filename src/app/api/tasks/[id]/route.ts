import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { TaskStatus, TaskPriority } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      labels: true,
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "MANAGER" && task.assigneeId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(task);
}

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

  const body = await request.json() as {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    clientId?: string | null;
    assigneeId?: string | null;
    labels?: { name: string; color: string }[];
  };

  const isManager = user.role === "MANAGER";

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
        ...(body.clientId !== undefined ? { clientId: body.clientId } : {}),
        ...(!isManager && body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        comments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        labels: true,
      },
    });

    if (body.labels !== undefined) {
      await tx.taskLabel.deleteMany({ where: { taskId: id } });
      if (body.labels.length > 0) {
        await tx.taskLabel.createMany({
          data: body.labels.map((l) => ({ taskId: id, name: l.name, color: l.color })),
        });
      }
      const labels = await tx.taskLabel.findMany({ where: { taskId: id } });
      return { ...updated, labels };
    }

    return updated;
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE",
    entityType: "Task",
    entityId: id,
    metadata: { changes: Object.keys(body) },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "DELETE",
    entityType: "Task",
    entityId: id,
    metadata: { title: existing.title },
  });

  return NextResponse.json({ success: true });
}
