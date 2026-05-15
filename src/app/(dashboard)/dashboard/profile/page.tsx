import { requireAuth } from "@/lib/auth-guards";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/users/profile-form";

export default async function ProfilePage() {
  await requireAuth();
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
    },
  });

  if (!user) notFound();

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
        <p className="text-sm text-neutral-400 mt-1">Gerencie suas informações pessoais</p>
      </div>
      <ProfileForm user={{ ...user, tags: user.tags as string[] }} />
    </div>
  );
}
