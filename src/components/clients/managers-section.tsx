"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/formatting";
import type { Role } from "@prisma/client";
import type { UserSummary } from "@/types/index";

interface Manager {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

interface ManagersSectionProps {
  clientId: string;
  managers: Manager[];
  userRole: Role;
}

export function ManagersSection({ clientId, managers: initialManagers, userRole }: ManagersSectionProps) {
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [showAdd, setShowAdd] = useState(false);
  const [allManagers, setAllManagers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  useEffect(() => {
    if (showAdd) {
      fetch("/api/users?role=MANAGER")
        .then((r) => r.json())
        .then((data: UserSummary[]) => setAllManagers(data))
        .catch(() => setAllManagers([]));
    }
  }, [showAdd]);

  const availableManagers = allManagers.filter(
    (u) => !managers.some((m) => m.userId === u.id)
  );

  async function handleAdd() {
    if (!selectedUserId) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/managers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId }),
    });
    if (res.ok) {
      const data = await res.json() as { userId: string; user: { id: string; name: string; email: string; role: Role } };
      setManagers((prev) => [...prev, data]);
      setSelectedUserId("");
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remover este gestor?")) return;
    setRemovingId(userId);
    await fetch(`/api/clients/${clientId}/managers`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setManagers((prev) => prev.filter((m) => m.userId !== userId));
    setRemovingId(null);
  }

  return (
    <div className="space-y-3">
      {managers.length === 0 && (
        <p className="text-sm text-neutral-500 italic">Nenhum gestor atribuído</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {managers.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2.5"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300 flex-shrink-0">
              {initials(m.user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{m.user.name}</p>
              <p className="text-xs text-neutral-500 truncate">{m.user.email}</p>
            </div>
            {canEdit && (
              <button
                onClick={() => handleRemove(m.userId)}
                disabled={removingId === m.userId}
                className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        showAdd ? (
          <div className="bg-neutral-800/50 border border-red-500/30 rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium text-neutral-300">Adicionar Gestor</p>
            {availableManagers.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">Todos os gestores já estão atribuídos</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableManagers.map((u) => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedUserId === u.id ? "bg-red-500/10" : "hover:bg-neutral-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="manager"
                      value={u.id}
                      checked={selectedUserId === u.id}
                      onChange={() => setSelectedUserId(u.id)}
                      className="text-red-500"
                    />
                    <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300">
                      {initials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-300 truncate">{u.name}</p>
                      <p className="text-xs text-neutral-600 truncate">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saving || !selectedUserId}
                onClick={handleAdd}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {saving ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowAdd(false); setSelectedUserId(""); }}
                className="text-neutral-400 hover:text-white"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-2.5 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar Gestor
          </button>
        )
      )}
    </div>
  );
}
