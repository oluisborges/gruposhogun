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
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { initials } from "@/lib/formatting";
import type { ClientTag, Role } from "@prisma/client";
import type { ClientListItem } from "@/types/index";

const TAG_COLORS: Record<ClientTag, { bg: string; text: string }> = {
  MARMITARIA: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
  DELIVERY: { bg: "rgba(216,90,74,0.1)", text: "#d85a4a" },
  GENERICA: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
};

const TAG_LABELS: Record<ClientTag, string> = {
  MARMITARIA: "Marmitaria",
  DELIVERY: "Delivery",
  GENERICA: "Genérica",
};

const AVATAR_BG: Record<ClientTag, string> = {
  MARMITARIA: "linear-gradient(135deg, #4a2a00, #2d1800)",
  DELIVERY: "linear-gradient(135deg, #3d1a14, #240f0a)",
  GENERICA: "linear-gradient(135deg, #244a32, #15301f)",
};

const AVATAR_TEXT: Record<ClientTag, string> = {
  MARMITARIA: "#e8a73a",
  DELIVERY: "#d85a4a",
  GENERICA: "#9be03a",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", flex: 1 }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5450", pointerEvents: "none" }} />
            <input
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: 9,
                paddingBottom: 9,
                background: "#0f1813",
                border: "1px solid #1f2a23",
                borderRadius: 8,
                color: "#e6efe8",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* Tag filter */}
          <div style={{ display: "flex", gap: 6 }}>
            {(["ALL", "MARMITARIA", "DELIVERY", "GENERICA"] as const).map((t) => {
              const active = tagFilter === t;
              const color = t !== "ALL" ? TAG_COLORS[t] : null;
              return (
                <button
                  key={t}
                  onClick={() => setTagFilter(t)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    border: active
                      ? `1px solid ${color ? color.text + "55" : "#28342a"}`
                      : "1px solid #1f2a23",
                    background: active
                      ? (color ? color.bg : "rgba(125,193,40,0.1)")
                      : "#0f1813",
                    color: active
                      ? (color ? color.text : "#7DC128")
                      : "#6e7a70",
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  {t === "ALL" ? "Todos" : TAG_LABELS[t]}
                </button>
              );
            })}
          </div>

          {/* Archive toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              border: showArchived ? "1px solid #28342a" : "1px solid #1f2a23",
              background: showArchived ? "rgba(125,193,40,0.08)" : "#0f1813",
              color: showArchived ? "#a8b3aa" : "#6e7a70",
              cursor: "pointer",
            }}
          >
            <Archive style={{ width: 12, height: 12 }} />
            Arquivados
          </button>
        </div>

        {canEdit && (
          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#7DC128",
              color: "#0a1408",
              fontSize: 13,
              padding: "9px 14px",
              borderRadius: 8,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Novo Cliente
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2a23" }}>
                {["Nome", "Tag", "Gestores", "Relatórios", "Status", ...(canEdit ? ["Ações"] : [])].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: i === (canEdit ? 5 : 4) ? "right" : "left",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      color: "#6e7a70",
                      fontWeight: 700,
                      paddingBottom: 10,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    style={{ padding: "48px 16px", textAlign: "center", color: "#6e7a70", fontSize: 13 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Search style={{ width: 24, height: 24, opacity: 0.4 }} />
                      Nenhum cliente encontrado
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((client, idx) => (
                  <tr
                    key={client.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? "1px dashed #1f2a23" : "none",
                    }}
                  >
                    {/* Nome */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: AVATAR_BG[client.tag],
                            border: "1px solid #284d36",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 11,
                            fontWeight: 700,
                            color: AVATAR_TEXT[client.tag],
                          }}
                        >
                          {initials(client.name)}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            style={{ fontWeight: 600, color: "#e6efe8", fontSize: 13, textDecoration: "none" }}
                          >
                            {client.name}
                          </Link>
                          {client.contactName && (
                            <p style={{ fontSize: 11, color: "#6e7a70", marginTop: 1 }}>{client.contactName}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tag */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: 20,
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          background: TAG_COLORS[client.tag].bg,
                          color: TAG_COLORS[client.tag].text,
                        }}
                      >
                        {TAG_LABELS[client.tag]}
                      </span>
                    </td>

                    {/* Gestores */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {client.managers.slice(0, 3).map((m) => (
                          <div
                            key={m.userId}
                            title={m.user.name}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              background: "linear-gradient(135deg, #244a32, #15301f)",
                              border: "1px solid #284d36",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#9be03a",
                              flexShrink: 0,
                            }}
                          >
                            {initials(m.user.name)}
                          </div>
                        ))}
                        {client.managers.length > 3 && (
                          <span style={{ fontSize: 11, color: "#6e7a70", marginLeft: 2 }}>
                            +{client.managers.length - 3}
                          </span>
                        )}
                        {client.managers.length === 0 && (
                          <span style={{ fontSize: 13, color: "#4a5450" }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Relatórios */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "#182219",
                          color: "#6e7a70",
                          fontFamily: "var(--font-mono)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {client._count.reports}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "12px 16px" }}>
                      {client.active ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: 20,
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: ".06em",
                            textTransform: "uppercase",
                            background: "rgba(125,193,40,0.1)",
                            color: "#7DC128",
                          }}
                        >
                          Ativo
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: 20,
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: ".06em",
                            textTransform: "uppercase",
                            background: "#182219",
                            color: "#6e7a70",
                          }}
                        >
                          Arquivado
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    {canEdit && (
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <button
                            onClick={() => setEditClient(client)}
                            title="Editar"
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: "transparent",
                              border: "none",
                              color: "#4a5450",
                              cursor: "pointer",
                            }}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                          <button
                            onClick={() => handleArchive(client)}
                            disabled={archivingId === client.id}
                            title={client.active ? "Arquivar" : "Desarquivar"}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: "transparent",
                              border: "none",
                              color: "#4a5450",
                              cursor: "pointer",
                              opacity: archivingId === client.id ? 0.5 : 1,
                            }}
                          >
                            {client.active ? (
                              <Archive style={{ width: 13, height: 13 }} />
                            ) : (
                              <ArchiveRestore style={{ width: 13, height: 13 }} />
                            )}
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(client)}
                              disabled={deletingId === client.id}
                              title="Deletar"
                              style={{
                                padding: 6,
                                borderRadius: 6,
                                background: "transparent",
                                border: "none",
                                color: "#4a5450",
                                cursor: "pointer",
                                opacity: deletingId === client.id ? 0.5 : 1,
                              }}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
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
