import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { TaskStatus, TaskPriority } from "@prisma/client";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as TaskStatus | null;
  const priority = searchParams.get("priority") as TaskPriority | null;
  const assigneeId = searchParams.get("assigneeId") ?? undefined;
  const clientId = searchParams.get("clientId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const isManager = user.role === "MANAGER";

  const tasks = await prisma.task.findMany({
    where: {
      ...(isManager ? { assigneeId: user.id } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assigneeId && !isManager ? { assigneeId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      labels: true,
    },
    orderBy: [
      { createdAt: "asc" },
    ],
  });

  // Sort by priority desc, then dueDate asc nulls last, then createdAt asc
  const sorted = tasks.sort((a, b) => {
    const pA = PRIORITY_ORDER[a.priority];
    const pB = PRIORITY_ORDER[b.priority];
    if (pB !== pA) return pB - pA;

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return NextResponse.json(sorted);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    clientId?: string;
    assigneeId?: string;
    labels?: { name: string; color: string }[];
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const isManager = user.role === "MANAGER";
  const assigneeId = isManager ? user.id : (body.assigneeId ?? undefined);

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: body.title.trim(),
        description: body.description ?? null,
        status: body.status ?? "TODO",
        priority: body.priority ?? "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        clientId: body.clientId ?? null,
        assigneeId: assigneeId ?? null,
        createdById: user.id,
        labels: body.labels && body.labels.length > 0
          ? { create: body.labels.map((l) => ({ name: l.name, color: l.color })) }
          : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        labels: true,
      },
    });
    return created;
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "CREATE",
    entityType: "Task",
    entityId: task.id,
    metadata: { title: task.title },
  });

  return NextResponse.json(task, { status: 201 });
}
