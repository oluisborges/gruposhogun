"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserSummary } from "@/types";

interface UserFormProps {
  mode: "create" | "edit";
  user?: UserSummary & { active: boolean; createdAt: Date };
  currentUser: { id: string; role: string };
}

const TAGS = [
  { value: "MARMITARIA", label: "Marmitaria" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "GENERICA", label: "Genérica" },
] as const;

const ALL_ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "COORDINATOR", label: "Coordenador" },
  { value: "MANAGER", label: "Gerente" },
] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f1813",
  border: "1px solid #1f2a23",
  borderRadius: 8,
  color: "#e6efe8",
  fontSize: 13,
  padding: "9px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".12em",
  color: "#6e7a70",
  marginBottom: 6,
};

export function UserForm({ mode, user, currentUser }: UserFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user?.role ?? "MANAGER");
  const [tags, setTags] = useState<string[]>(
    user?.tags ? (user.tags as string[]) : []
  );
  const [active, setActive] = useState(user?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableRoles = ALL_ROLES.filter(
    (r) => !(currentUser.role === "COORDINATOR" && r.value === "OWNER")
  );

  const isEditingSelf = mode === "edit" && user?.id === currentUser.id;
  const roleDisabled = isEditingSelf;

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = { name, email, role, tags };

      if (mode === "create") {
        body.password = password;
      } else if (password) {
        body.password = password;
      }

      if (mode === "edit" && currentUser.role === "OWNER" && !isEditingSelf) {
        body.active = active;
      }

      const url = mode === "create" ? "/api/users" : `/api/users/${user!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Ocorreu um erro. Tente novamente.");
        return;
      }

      router.push("/dashboard/users");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 24, maxWidth: 520 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && (
          <div style={{ background: "rgba(216,90,74,0.1)", border: "1px solid rgba(216,90,74,0.3)", color: "#d85a4a", fontSize: 13, padding: "10px 14px", borderRadius: 8 }}>
            {error}
          </div>
        )}

        {/* Nome */}
        <div>
          <label style={labelStyle}>Nome *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
            required
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
            style={inputStyle}
          />
        </div>

        {/* Senha */}
        <div>
          <label style={labelStyle}>
            Senha{mode === "create" ? " *" : " (deixe em branco para manter a atual)"}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "create" ? "Senha obrigatória" : "Nova senha (opcional)"}
            required={mode === "create"}
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        {/* Papel */}
        <div>
          <label style={labelStyle}>Papel</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={roleDisabled}
            style={{
              ...inputStyle,
              cursor: roleDisabled ? "not-allowed" : "pointer",
              opacity: roleDisabled ? 0.5 : 1,
            }}
          >
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {roleDisabled && (
            <p style={{ fontSize: 11, color: "#6e7a70", marginTop: 4 }}>Você não pode alterar seu próprio papel.</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags</label>
          <div style={{ display: "flex", gap: 8 }}>
            {TAGS.map((tag) => {
              const checked = tags.includes(tag.value);
              const TAG_ACTIVE: Record<string, { bg: string; color: string; border: string }> = {
                MARMITARIA: { bg: "rgba(232,167,58,0.12)", color: "#e8a73a", border: "rgba(232,167,58,0.3)" },
                DELIVERY: { bg: "rgba(216,90,74,0.12)", color: "#d85a4a", border: "rgba(216,90,74,0.3)" },
                GENERICA: { bg: "rgba(125,193,40,0.12)", color: "#7DC128", border: "rgba(125,193,40,0.3)" },
              };
              const s = TAG_ACTIVE[tag.value];
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    border: checked ? `1px solid ${s.border}` : "1px solid #1f2a23",
                    background: checked ? s.bg : "#0f1813",
                    color: checked ? s.color : "#6e7a70",
                    cursor: "pointer",
                    transition: "all .15s",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ativo — OWNER only, hidden in create mode and when editing self */}
        {mode === "edit" && currentUser.role === "OWNER" && !isEditingSelf && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              style={{
                position: "relative",
                display: "inline-flex",
                height: 20,
                width: 36,
                alignItems: "center",
                borderRadius: 10,
                border: "2px solid",
                borderColor: active ? "#7DC128" : "#1f2a23",
                background: active ? "#7DC128" : "#182219",
                cursor: "pointer",
                transition: "all .2s",
                padding: 0,
              }}
            >
              <span style={{
                display: "inline-block",
                height: 14,
                width: 14,
                borderRadius: "50%",
                background: "#fff",
                transform: active ? "translateX(16px)" : "translateX(2px)",
                transition: "transform .2s",
              }} />
            </button>
            <label
              style={{ fontSize: 13, color: "#a8b3aa", cursor: "pointer" }}
              onClick={() => setActive(!active)}
            >
              {active ? "Ativo" : "Inativo"}
            </label>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            style={{
              border: "1px solid #1f2a23",
              color: "#a8b3aa",
              background: "#0f1813",
              fontSize: 13,
              padding: "8px 14px",
              borderRadius: 8,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#4a6a1a" : "#7DC128",
              color: "#0a1408",
              fontSize: 13,
              padding: "9px 16px",
              borderRadius: 8,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading
              ? mode === "create" ? "Criando..." : "Salvando..."
              : mode === "create" ? "Criar Usuário" : "Salvar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
