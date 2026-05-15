"use client";

import { useState, useEffect } from "react";
import { Trash2, UserPlus } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {managers.length === 0 && (
        <p style={{ fontSize: 13, color: "#4a5450", fontStyle: "italic" }}>Nenhum gestor atribuído</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
        {managers.map((m) => (
          <div
            key={m.userId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#141f18",
              border: "1px solid #1f2a23",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
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
              {initials(m.user.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#e6efe8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.user.name}
              </p>
              <p style={{ fontSize: 11, color: "#6e7a70", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.user.email}
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => handleRemove(m.userId)}
                disabled={removingId === m.userId}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  background: "transparent",
                  border: "none",
                  cursor: removingId === m.userId ? "not-allowed" : "pointer",
                  color: "#4a5450",
                  opacity: removingId === m.userId ? 0.5 : 1,
                  flexShrink: 0,
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        showAdd ? (
          <div style={{ background: "#141f18", border: "1px solid rgba(125,193,40,0.2)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e6efe8" }}>Adicionar Gestor</p>
            {availableManagers.length === 0 ? (
              <p style={{ fontSize: 13, color: "#4a5450", fontStyle: "italic" }}>Todos os gestores já estão atribuídos</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflowY: "auto" }}>
                {availableManagers.map((u) => (
                  <label
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: selectedUserId === u.id ? "rgba(125,193,40,0.08)" : "transparent",
                      transition: "background .15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="manager"
                      value={u.id}
                      checked={selectedUserId === u.id}
                      onChange={() => setSelectedUserId(u.id)}
                      style={{ accentColor: "#7DC128" }}
                    />
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "linear-gradient(135deg, #244a32, #15301f)",
                      border: "1px solid #284d36",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#9be03a",
                    }}>
                      {initials(u.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: "#a8b3aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                      <p style={{ fontSize: 11, color: "#4a5450", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={saving || !selectedUserId}
                onClick={handleAdd}
                style={{
                  background: saving || !selectedUserId ? "#4a6a1a" : "#7DC128",
                  color: "#0a1408",
                  fontSize: 13,
                  padding: "9px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: saving || !selectedUserId ? "not-allowed" : "pointer",
                  opacity: saving || !selectedUserId ? 0.7 : 1,
                }}
              >
                {saving ? "Adicionando..." : "Adicionar"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setSelectedUserId(""); }}
                style={{
                  border: "1px solid #1f2a23",
                  color: "#a8b3aa",
                  background: "#0f1813",
                  fontSize: 13,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: "100%",
              padding: "10px 0",
              border: "1px dashed #28342a",
              borderRadius: 10,
              fontSize: 13,
              color: "#6e7a70",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all .15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = "#7DC128"; e.currentTarget.style.borderColor = "rgba(125,193,40,0.4)"; }}
            onMouseOut={(e) => { e.currentTarget.style.color = "#6e7a70"; e.currentTarget.style.borderColor = "#28342a"; }}
          >
            <UserPlus style={{ width: 14, height: 14 }} />
            Adicionar Gestor
          </button>
        )
      )}
    </div>
  );
}
