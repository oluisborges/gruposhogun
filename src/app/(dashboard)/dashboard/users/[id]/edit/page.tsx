import { requireCoordinator } from "@/lib/auth-guards";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UserForm } from "@/components/users/user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCoordinator();
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Editar Usuário</h1>
        <p className="text-sm text-neutral-400 mt-1">Edite as informações de {user.name}</p>
      </div>
      <UserForm
        mode="edit"
        user={user}
        currentUser={{ id: sessionUser.id, role: sessionUser.role }}
      />
    </div>
  );
}
