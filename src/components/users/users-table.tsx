"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Clock,
  Trash2,
  Search,
} from "lucide-react";
import { initials } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
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

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  OWNER: { bg: "rgba(216,90,74,0.1)", text: "#d85a4a" },
  COORDINATOR: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
  MANAGER: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
};

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  MARMITARIA: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
  DELIVERY: { bg: "rgba(216,90,74,0.1)", text: "#d85a4a" },
  GENERICA: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
};

const selectStyle: React.CSSProperties = {
  height: 34,
  fontSize: 13,
  background: "#0f1813",
  border: "1px solid #1f2a23",
  color: "#a8b3aa",
  borderRadius: 8,
  padding: "0 10px",
  outline: "none",
  cursor: "pointer",
};

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
      const res = await fetch(`/api/users/${userId}/toggle-active`, { method: "POST" });
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#4a5450", pointerEvents: "none" }} />
          <input
            placeholder="Buscar por nome ou email..."
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
              boxSizing: "border-box",
            }}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">Todos os papéis</option>
          <option value="OWNER">Owner</option>
          <option value="COORDINATOR">Coordenador</option>
          <option value="MANAGER">Gerente</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2a23" }}>
                {["Usuário", "Papel", "Tags", "Status", "Criado em", "Ações"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: i === 5 ? "right" : "left",
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
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#6e7a70", fontSize: 13 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Search style={{ width: 24, height: 24, opacity: 0.4 }} />
                      Nenhum usuário encontrado
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? "1px dashed #1f2a23" : "none" }}
                  >
                    {/* Avatar + Nome + Email */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #244a32, #15301f)",
                          border: "1px solid #284d36",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#9be03a",
                          flexShrink: 0,
                        }}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "#e6efe8", fontSize: 13 }}>{u.name}</p>
                          <p style={{ fontSize: 11, color: "#6e7a70" }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 8px",
                        borderRadius: 20,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        background: ROLE_COLORS[u.role]?.bg ?? "#182219",
                        color: ROLE_COLORS[u.role]?.text ?? "#6e7a70",
                      }}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    {/* Tags */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {u.tags.length === 0 ? (
                          <span style={{ fontSize: 13, color: "#4a5450" }}>—</span>
                        ) : (
                          u.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 8px",
                                borderRadius: 20,
                                fontSize: 10.5,
                                fontWeight: 700,
                                letterSpacing: ".06em",
                                textTransform: "uppercase",
                                background: TAG_COLORS[tag]?.bg ?? "#182219",
                                color: TAG_COLORS[tag]?.text ?? "#6e7a70",
                              }}
                            >
                              {TAG_LABELS[tag] ?? tag}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 8px",
                        borderRadius: 20,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        background: u.active ? "rgba(125,193,40,0.1)" : "#182219",
                        color: u.active ? "#7DC128" : "#6e7a70",
                      }}>
                        {u.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    {/* createdAt */}
                    <td style={{ padding: "12px 16px", color: "#6e7a70", fontSize: 12, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                      {formatBRTDate(u.createdAt)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        <button
                          onClick={() => router.push(`/dashboard/users/${u.id}/edit`)}
                          title="Editar"
                          style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", color: "#4a5450", cursor: "pointer" }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "#a8b3aa")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
                        >
                          <Pencil style={{ width: 13, height: 13 }} />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/users/${u.id}/history`)}
                          title="Histórico"
                          style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", color: "#4a5450", cursor: "pointer" }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "#a8b3aa")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
                        >
                          <Clock style={{ width: 13, height: 13 }} />
                        </button>
                        {currentUser.role === "OWNER" && currentUser.id !== u.id && (
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            disabled={togglingId === u.id}
                            title={u.active ? "Desativar" : "Ativar"}
                            style={{
                              position: "relative",
                              display: "inline-flex",
                              height: 18,
                              width: 32,
                              alignItems: "center",
                              borderRadius: 9,
                              border: "2px solid",
                              borderColor: u.active ? "#7DC128" : "#1f2a23",
                              background: u.active ? "#7DC128" : "#182219",
                              cursor: togglingId === u.id ? "not-allowed" : "pointer",
                              transition: "all .2s",
                              padding: 0,
                              opacity: togglingId === u.id ? 0.5 : 1,
                            }}
                          >
                            <span style={{
                              display: "inline-block",
                              height: 12,
                              width: 12,
                              borderRadius: "50%",
                              background: "#fff",
                              transform: u.active ? "translateX(14px)" : "translateX(2px)",
                              transition: "transform .2s",
                            }} />
                          </button>
                        )}
                        {currentUser.role === "OWNER" && currentUser.id !== u.id && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            title="Excluir"
                            style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", color: "#4a5450", cursor: "pointer" }}
                            onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                            onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
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

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setDeleteTarget(null)} />
          <div style={{
            position: "relative",
            background: "#141f18",
            border: "1px solid #28342a",
            borderRadius: 10,
            padding: 24,
            maxWidth: 420,
            width: "100%",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".02em", color: "#e6efe8", margin: "0 0 12px" }}>
              Excluir usuário
            </h2>
            <p style={{ fontSize: 13, color: "#a8b3aa", marginBottom: 20 }}>
              Tem certeza que deseja excluir{" "}
              <strong style={{ color: "#e6efe8" }}>{deleteTarget.name}</strong>?
              {" "}Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
                style={{
                  border: "1px solid #1f2a23",
                  color: "#a8b3aa",
                  background: "#0f1813",
                  fontSize: 13,
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  opacity: deletingId ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                disabled={!!deletingId}
                style={{
                  background: deletingId ? "#7a2a22" : "#d85a4a",
                  color: "#fff",
                  fontSize: 13,
                  padding: "9px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: deletingId ? "not-allowed" : "pointer",
                  opacity: deletingId ? 0.8 : 1,
                }}
              >
                {deletingId ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
