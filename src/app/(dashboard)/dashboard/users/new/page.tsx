import { requireCoordinator } from "@/lib/auth-guards";
import { getSessionUser } from "@/lib/session";
import { UserForm } from "@/components/users/user-form";

export default async function NewUserPage() {
  await requireCoordinator();
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Novo Usuário</h1>
        <p className="text-sm text-neutral-400 mt-1">Crie um novo usuário no sistema</p>
      </div>
      <UserForm mode="create" currentUser={{ id: sessionUser.id, role: sessionUser.role }} />
    </div>
  );
}
