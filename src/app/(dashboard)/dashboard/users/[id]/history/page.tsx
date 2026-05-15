import { requireCoordinator } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UserHistory } from "@/components/users/user-history";

export default async function UserHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCoordinator();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!user) notFound();

  const logs = await prisma.auditLog.findMany({
    where: { entityId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6">
      <UserHistory logs={logs} userName={user.name} />
    </div>
  );
}
