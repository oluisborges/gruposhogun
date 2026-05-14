"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  Plus,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatting";
import type { ClientTag, Role } from "@prisma/client";
import type { ClientListItem } from "@/types/index";

const TAG_COLORS: Record<ClientTag, string> = {
  MARMITARIA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELIVERY: "bg-red-500/10 text-red-400 border-red-500/20",
  GENERICA: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

const TAG_LABELS: Record<ClientTag, string> = {
  MARMITARIA: "Marmitaria",
  DELIVERY: "Delivery",
  GENERICA: "Genérica",
};

interface ClientsTableProps {
  clients: ClientListItem[];
  userRole: Role;
  userId: string;
}

export function ClientsTable({ clients, userRole, userId }: ClientsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<ClientTag | "ALL">("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientListItem | null>(null);

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";
  const canDelete = userRole === "OWNER";

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (!showArchived && !c.active) return false;
      if (showArchived && c.active) return false;
      if (tagFilter !== "ALL" && c.tag !== tagFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, search, tagFilter, showArchived]);

  async function handleArchive(client: ClientListItem) {
    setArchivingId(client.id);
    try {
      await fetch(`/api/clients/${client.id}/archive`, { method: "POST" });
      router.refresh();
    } finally {
      setArchivingId(null);
    }
  }

  async function handleDelete(client: ClientListItem) {
    if (!confirm(`Deseja deletar permanentemente "${client.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(client.id);
    try {
      await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500"
            />
          </div>

          {/* Tag filter */}
          <div className="flex gap-2">
            {(["ALL", "MARMITARIA", "DELIVERY", "GENERICA"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  tagFilter === t
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                )}
              >
                {t === "ALL" ? "Todos" : TAG_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Archive toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5",
              showArchived
                ? "bg-neutral-700/50 text-neutral-300 border-neutral-600"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700"
            )}
          >
            <Archive className="w-3.5 h-3.5" />
            Arquivados
          </button>
        </div>

        {canEdit && (
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Tag</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Gestores</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Relatórios</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Status</th>
                {canEdit && (
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-neutral-500">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                  >
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="font-medium text-white hover:text-red-400 transition-colors"
                      >
                        {client.name}
                      </Link>
                      {client.contactName && (
                        <p className="text-xs text-neutral-500 mt-0.5">{client.contactName}</p>
                      )}
                    </td>

                    {/* Tag */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                          TAG_COLORS[client.tag]
                        )}
                      >
                        {TAG_LABELS[client.tag]}
                      </span>
                    </td>

                    {/* Gestores */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {client.managers.slice(0, 3).map((m) => (
                          <div
                            key={m.userId}
                            title={m.user.name}
                            className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300 flex-shrink-0"
                          >
                            {initials(m.user.name)}
                          </div>
                        ))}
                        {client.managers.length > 3 && (
                          <span className="text-xs text-neutral-500 ml-1">
                            +{client.managers.length - 3}
                          </span>
                        )}
                        {client.managers.length === 0 && (
                          <span className="text-xs text-neutral-600">—</span>
                        )}
                      </div>
                    </td>

                    {/* Relatórios */}
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{client._count.reports}</Badge>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {client.active ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Arquivado</Badge>
                      )}
                    </td>

                    {/* Ações */}
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditClient(client)}
                            className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(client)}
                            disabled={archivingId === client.id}
                            className="p-1.5 rounded text-neutral-500 hover:text-yellow-400 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                            title={client.active ? "Arquivar" : "Desarquivar"}
                          >
                            {client.active ? (
                              <Archive className="w-3.5 h-3.5" />
                            ) : (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(client)}
                              disabled={deletingId === client.id}
                              className="p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                              title="Deletar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {canEdit && (
        <>
          <ClientFormModal
            open={createModalOpen}
            onOpenChange={setCreateModalOpen}
            onSuccess={() => {
              setCreateModalOpen(false);
              router.refresh();
            }}
          />
          {editClient && (
            <ClientFormModal
              open={!!editClient}
              onOpenChange={(open) => { if (!open) setEditClient(null); }}
              client={editClient}
              onSuccess={() => {
                setEditClient(null);
                router.refresh();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
