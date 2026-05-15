"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import { Pencil, Clock, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/types";

interface UsersTableProps {
  users: (UserSummary & { createdAt: Date })[];
  currentUser: { id: string; role: string };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  COORDINATOR: "Coordenador",
  MANAGER: "Gerente",
};

const TAG_LABELS: Record<string, string> = {
  MARMITARIA: "Marmitaria",
  DELIVERY: "Delivery",
  GENERICA: "Genérica",
};

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    OWNER: "bg-red-500/20 text-red-400 border-red-500/30",
    COORDINATOR: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    MANAGER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        colorMap[role] ?? "bg-neutral-700 text-neutral-300 border-neutral-600"
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const colorMap: Record<string, string> = {
    MARMITARIA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    DELIVERY: "bg-red-500/20 text-red-400 border-red-500/30",
    GENERICA: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-xs border",
        colorMap[tag] ?? "bg-neutral-700 text-neutral-300 border-neutral-600"
      )}
    >
      {TAG_LABELS[tag] ?? tag}
    </span>
  );
}

export function UsersTable({ users, currentUser }: UsersTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<(UserSummary & { createdAt: Date }) | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? u.active : !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  async function handleToggleActive(userId: string) {
    setTogglingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/toggle-active`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Erro ao alterar status");
      } else {
        startTransition(() => router.refresh());
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Erro ao excluir usuário");
      } else {
        setDeleteTarget(null);
        startTransition(() => router.refresh());
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os papéis</SelectItem>
            <SelectItem value="OWNER">Owner</SelectItem>
            <SelectItem value="COORDINATOR">Coordenador</SelectItem>
            <SelectItem value="MANAGER">Gerente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Ativo</SelectItem>
            <SelectItem value="INACTIVE">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Usuário</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Papel</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Tags</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Criado em</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-neutral-800/50 last:border-0 hover:bg-neutral-800/20 transition-colors"
                  >
                    {/* Avatar + Nome + Email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-red-400">
                            {initials(u.name)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{u.name}</p>
                          <p className="text-xs text-neutral-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    {/* Tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.tags.length === 0 ? (
                          <span className="text-neutral-600 text-xs">—</span>
                        ) : (
                          u.tags.map((tag) => (
                            <TagBadge key={tag} tag={tag} />
                          ))
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          u.active
                            ? "bg-green-500/20 text-green-400"
                            : "bg-neutral-700 text-neutral-400"
                        )}
                      >
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    {/* createdAt */}
                    <td className="px-4 py-3 text-neutral-400 text-xs">
                      {formatBRTDate(u.createdAt)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => router.push(`/dashboard/users/${u.id}/edit`)}
                          className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* History */}
                        <button
                          onClick={() => router.push(`/dashboard/users/${u.id}/history`)}
                          className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                          title="Histórico"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        {/* Toggle active — OWNER only, not self */}
                        {currentUser.role === "OWNER" && currentUser.id !== u.id && (
                          <Switch
                            checked={u.active}
                            disabled={togglingId === u.id}
                            onCheckedChange={() => handleToggleActive(u.id)}
                            title={u.active ? "Desativar" : "Ativar"}
                          />
                        )}
                        {/* Delete — OWNER only, not self */}
                        {currentUser.role === "OWNER" && currentUser.id !== u.id && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong className="text-white">{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={!!deletingId}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!!deletingId}
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              {deletingId ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
