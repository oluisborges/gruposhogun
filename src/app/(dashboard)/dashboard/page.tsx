import { requireAuth } from "@/lib/auth-guards";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Bem-vindo, {session.user?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {["Clientes", "Tarefas", "Relatórios", "Gestores"].map((label) => (
          <div
            key={label}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-md">
                <LayoutDashboard className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-xl font-semibold text-white">—</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-sm font-medium text-neutral-400 mb-4">
          Sistema sendo configurado
        </h2>
        <p className="text-neutral-500 text-sm">
          As funcionalidades serão adicionadas nas próximas fases de implementação.
        </p>
      </div>
    </div>
  );
}
