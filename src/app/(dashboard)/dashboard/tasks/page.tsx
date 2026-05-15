import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { TasksBoard } from "@/components/tasks/tasks-board";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { Role } from "@prisma/client";

export default async function TasksPage() {
  const session = await requireAuth();
  const userRole = session.user.role as Role;
  const userId = session.user.id as string;

  const isManager = userRole === "MANAGER";

  const tasks = await prisma.task.findMany({
    where: isManager ? { assigneeId: userId } : {},
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
    orderBy: { createdAt: "asc" },
  });

  const clients = isManager
    ? []
    : await prisma.client.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

  const users = isManager
    ? []
    : await prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true, email: true, role: true, tags: true, active: true },
        orderBy: { name: "asc" },
      });

  const currentUser: UserSummary = {
    id: userId,
    name: session.user.name as string,
    email: session.user.email as string,
    role: userRole,
    tags: (session.user as unknown as { tags?: import("@prisma/client").ClientTag[] }).tags ?? [],
    active: true,
  };

  return (
    <TasksBoard
      tasks={tasks as TaskWithRelations[]}
      currentUser={currentUser}
      clients={clients}
      users={users as UserSummary[]}
    />
  );
}
