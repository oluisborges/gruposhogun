import { requireCoordinator } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { UsersTable } from "@/components/users/users-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default async function UsersPage() {
  await requireCoordinator();
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Gerencie os usuários do sistema
          </p>
        </div>
        {(sessionUser.role === "OWNER" || sessionUser.role === "COORDINATOR") && (
          <Button asChild>
            <Link href="/dashboard/users/new">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Link>
          </Button>
        )}
      </div>
      <UsersTable
        users={users}
        currentUser={{ id: sessionUser.id, role: sessionUser.role }}
      />
    </div>
  );
}
