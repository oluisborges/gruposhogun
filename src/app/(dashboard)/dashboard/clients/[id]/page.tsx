import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ClientPage } from "@/components/clients/client-page";
import type { Role } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAuth();
  const userRole = session.user.role as Role;
  const userId = session.user.id as string;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      managers: { include: { user: true } },
      metaAccounts: true,
      reports: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { generatedBy: true },
      },
      customSections: { orderBy: { order: "asc" } },
      attachments: true,
      tasks: {
        include: { assignee: true, labels: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { reports: true, tasks: true } },
    },
  });

  if (!client) notFound();

  if (userRole === "MANAGER") {
    const manages = client.managers.some((m) => m.userId === userId);
    if (!manages) redirect("/dashboard/clients");
  }

  return (
    <ClientPage
      client={client}
      userRole={userRole}
      userId={userId}
    />
  );
}
