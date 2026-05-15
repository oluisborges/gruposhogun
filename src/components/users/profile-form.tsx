"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { initials } from "@/lib/formatting";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tags: string[];
  };
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

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfoError(null);
    setInfoLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInfoError(data.error ?? "Erro ao salvar. Tente novamente.");
        return;
      }

      toast({ title: "Perfil atualizado com sucesso!" });
    } catch {
      setInfoError("Erro de conexão. Tente novamente.");
    } finally {
      setInfoLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error ?? "Erro ao alterar senha. Tente novamente.");
        return;
      }

      toast({ title: "Senha alterada com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Erro de conexão. Tente novamente.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 520 }}>
      {/* User info display */}
      <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: "linear-gradient(135deg, #244a32, #15301f)",
          border: "1px solid #284d36",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          color: "#9be03a",
          flexShrink: 0,
        }}>
          {initials(user.name)}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#e6efe8" }}>{user.name}</p>
          <p style={{ fontSize: 12, color: "#6e7a70", marginTop: 2 }}>{ROLE_LABELS[user.role] ?? user.role}</p>
          {user.tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {user.tags.map((tag) => (
                <span key={tag} style={{ fontSize: 11, color: "#7DC128" }}>
                  {TAG_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personal data */}
      <section style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#6e7a70", marginBottom: 4 }}>
            Seção
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".02em",
            color: "#e6efe8",
            margin: 0,
          }}>
            Dados Pessoais
          </h2>
        </div>
        <form onSubmit={handleInfoSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {infoError && (
            <div style={{ background: "rgba(216,90,74,0.1)", border: "1px solid rgba(216,90,74,0.3)", color: "#d85a4a", fontSize: 13, padding: "10px 14px", borderRadius: 8 }}>
              {infoError}
            </div>
          )}
          <div>
            <label style={labelStyle}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <button
              type="submit"
              disabled={infoLoading}
              style={{
                background: infoLoading ? "#4a6a1a" : "#7DC128",
                color: "#0a1408",
                fontSize: 13,
                padding: "9px 16px",
                borderRadius: 8,
                fontWeight: 700,
                border: "none",
                cursor: infoLoading ? "not-allowed" : "pointer",
                opacity: infoLoading ? 0.8 : 1,
              }}
            >
              {infoLoading ? "Salvando..." : "Salvar Dados"}
            </button>
          </div>
        </form>
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: "#1f2a23" }} />

      {/* Change password */}
      <section style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#6e7a70", marginBottom: 4 }}>
            Segurança
          </p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".02em",
            color: "#e6efe8",
            margin: 0,
          }}>
            Alterar Senha
          </h2>
        </div>
        <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {passwordError && (
            <div style={{ background: "rgba(216,90,74,0.1)", border: "1px solid rgba(216,90,74,0.3)", color: "#d85a4a", fontSize: 13, padding: "10px 14px", borderRadius: 8 }}>
              {passwordError}
            </div>
          )}
          <div>
            <label style={labelStyle}>Senha Atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Sua senha atual"
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              required
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                background: passwordLoading ? "#4a6a1a" : "#7DC128",
                color: "#0a1408",
                fontSize: 13,
                padding: "9px 16px",
                borderRadius: 8,
                fontWeight: 700,
                border: "none",
                cursor: passwordLoading ? "not-allowed" : "pointer",
                opacity: passwordLoading ? 0.8 : 1,
              }}
            >
              {passwordLoading ? "Alterando..." : "Alterar Senha"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
