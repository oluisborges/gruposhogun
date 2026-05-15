"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { ClientTag, AccountObjective } from "@prisma/client";
import type { UserSummary } from "@/types/index";

const TAG_OPTIONS: { value: ClientTag; label: string }[] = [
  { value: "MARMITARIA", label: "Marmitaria" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "GENERICA", label: "Genérica" },
];

const TAG_ACTIVE_STYLE: Record<ClientTag, { bg: string; color: string; border: string }> = {
  MARMITARIA: { bg: "rgba(232,167,58,0.12)", color: "#e8a73a", border: "rgba(232,167,58,0.3)" },
  DELIVERY: { bg: "rgba(216,90,74,0.12)", color: "#d85a4a", border: "rgba(216,90,74,0.3)" },
  GENERICA: { bg: "rgba(125,193,40,0.12)", color: "#7DC128", border: "rgba(125,193,40,0.3)" },
};

const OBJECTIVE_OPTIONS: { value: AccountObjective; label: string }[] = [
  { value: "CARDAPIO", label: "Cardápio" },
  { value: "LEADS", label: "Leads" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

interface ClientFormData {
  id: string;
  name: string;
  tag: ClientTag;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  usesPix: boolean;
  pixValue: number | null;
  managers: { userId: string }[];
}

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientFormData;
  onSuccess: () => void;
}

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

const sectionStyle: React.CSSProperties = {
  background: "#0f1813",
  border: "1px solid #1f2a23",
  borderRadius: 8,
  overflow: "hidden",
};

export function ClientFormModal({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [error, setError] = useState("");

  // Basic fields
  const [name, setName] = useState(client?.name ?? "");
  const [tag, setTag] = useState<ClientTag>(client?.tag ?? "GENERICA");
  const [contactName, setContactName] = useState(client?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(client?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ?? "");
  const [usesPix, setUsesPix] = useState(client?.usesPix ?? false);
  const [pixValue, setPixValue] = useState(client?.pixValue?.toString() ?? "");
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>(
    client?.managers.map((m) => m.userId) ?? []
  );

  // Meta Ads account (optional, create-only)
  const [showMetaSection, setShowMetaSection] = useState(false);
  const [metaAccountId, setMetaAccountId] = useState("");
  const [metaAccountName, setMetaAccountName] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaObjective, setMetaObjective] = useState<AccountObjective>("CARDAPIO");
  const [metaCampaignFilter, setMetaCampaignFilter] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/users?role=MANAGER")
        .then((r) => r.json())
        .then((data: UserSummary[]) => setManagers(data))
        .catch(() => setManagers([]));
    }
  }, [open]);

  useEffect(() => {
    setName(client?.name ?? "");
    setTag(client?.tag ?? "GENERICA");
    setContactName(client?.contactName ?? "");
    setContactPhone(client?.contactPhone ?? "");
    setContactEmail(client?.contactEmail ?? "");
    setUsesPix(client?.usesPix ?? false);
    setPixValue(client?.pixValue?.toString() ?? "");
    setSelectedManagerIds(client?.managers.map((m) => m.userId) ?? []);
    setShowMetaSection(false);
    setMetaAccountId("");
    setMetaAccountName("");
    setMetaToken("");
    setMetaObjective("CARDAPIO");
    setMetaCampaignFilter("");
    setError("");
  }, [client, open]);

  function toggleManager(id: string) {
    setSelectedManagerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório"); return; }

    if (showMetaSection && metaAccountId && !metaToken) {
      setError("Token de acesso é obrigatório para vincular uma conta Meta");
      return;
    }

    setLoading(true);
    setError("");

    const metaAccount =
      showMetaSection && metaAccountId.trim() && metaToken.trim()
        ? {
            accountId: metaAccountId.trim(),
            accountName: metaAccountName.trim() || undefined,
            token: metaToken.trim(),
            objective: metaObjective,
            campaignFilter: metaCampaignFilter
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : undefined;

    const body = {
      name: name.trim(),
      tag,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      usesPix,
      pixValue: usesPix && pixValue ? parseFloat(pixValue) : undefined,
      managerIds: selectedManagerIds,
      metaAccount,
    };

    try {
      const url = client ? `/api/clients/${client.id}` : "/api/clients";
      const method = client ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error ?? "Erro ao salvar cliente");
        return;
      }

      onSuccess();
    } catch {
      setError("Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={() => onOpenChange(false)}
      />
      <div style={{
        position: "relative",
        background: "#141f18",
        border: "1px solid #28342a",
        borderRadius: 10,
        width: "100%",
        maxWidth: 520,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #1f2a23", position: "sticky", top: 0, background: "#141f18", zIndex: 1 }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".02em",
            color: "#e6efe8",
            margin: 0,
          }}>
            {client ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            style={{ padding: 6, background: "transparent", border: "none", color: "#6e7a70", cursor: "pointer", borderRadius: 6 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "rgba(216,90,74,0.1)", border: "1px solid rgba(216,90,74,0.3)", color: "#d85a4a", fontSize: 13, padding: "10px 14px", borderRadius: 8 }}>
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome da empresa *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marmitaria da Maria"
              style={inputStyle}
              required
            />
          </div>

          {/* Segmento */}
          <div>
            <label style={labelStyle}>Segmento</label>
            <div style={{ display: "flex", gap: 8 }}>
              {TAG_OPTIONS.map((opt) => {
                const active = tag === opt.value;
                const s = TAG_ACTIVE_STYLE[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTag(opt.value)}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: active ? `1px solid ${s.border}` : "1px solid #1f2a23",
                      background: active ? s.bg : "#0f1813",
                      color: active ? s.color : "#6e7a70",
                      cursor: "pointer",
                      transition: "all .15s",
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={labelStyle}>Contato</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nome do contato"
              style={inputStyle}
            />
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Telefone"
              style={inputStyle}
            />
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="E-mail"
              type="email"
              style={inputStyle}
            />
          </div>

          {/* PIX */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                role="switch"
                aria-checked={usesPix}
                onClick={() => setUsesPix(!usesPix)}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  height: 20,
                  width: 36,
                  alignItems: "center",
                  borderRadius: 10,
                  border: "2px solid",
                  borderColor: usesPix ? "#7DC128" : "#1f2a23",
                  background: usesPix ? "#7DC128" : "#182219",
                  cursor: "pointer",
                  transition: "all .2s",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    height: 14,
                    width: 14,
                    borderRadius: "50%",
                    background: "#fff",
                    transform: usesPix ? "translateX(16px)" : "translateX(2px)",
                    transition: "transform .2s",
                  }}
                />
              </button>
              <label
                style={{ fontSize: 13, color: "#a8b3aa", cursor: "pointer" }}
                onClick={() => setUsesPix(!usesPix)}
              >
                Usa PIX semanal
              </label>
            </div>
            {usesPix && (
              <input
                value={pixValue}
                onChange={(e) => setPixValue(e.target.value)}
                placeholder="Valor PIX (R$)"
                type="number"
                step="0.01"
                min="0"
                style={inputStyle}
              />
            )}
          </div>

          {/* Meta Ads — only on create */}
          {!client && (
            <div style={sectionStyle}>
              <button
                type="button"
                onClick={() => setShowMetaSection(!showMetaSection)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "transparent",
                  border: "none",
                  color: showMetaSection ? "#7DC128" : "#a8b3aa",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap style={{ width: 15, height: 15 }} />
                  Vincular Conta Meta Ads
                  <span style={{ fontSize: 11, color: "#4a5450", fontWeight: 400 }}>(opcional)</span>
                </span>
                {showMetaSection
                  ? <ChevronUp style={{ width: 16, height: 16 }} />
                  : <ChevronDown style={{ width: 16, height: 16 }} />
                }
              </button>

              {showMetaSection && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #1f2a23" }}>
                  <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Account ID + Name row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={labelStyle}>ID da Conta</label>
                        <input
                          value={metaAccountId}
                          onChange={(e) => setMetaAccountId(e.target.value)}
                          placeholder="act_XXXXXXXX"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Nome da Conta</label>
                        <input
                          value={metaAccountName}
                          onChange={(e) => setMetaAccountName(e.target.value)}
                          placeholder="Nome interno"
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Token */}
                    <div>
                      <label style={labelStyle}>Token de Acesso</label>
                      <input
                        value={metaToken}
                        onChange={(e) => setMetaToken(e.target.value)}
                        placeholder="EAAxxxxxxxx..."
                        style={inputStyle}
                        type="password"
                        autoComplete="off"
                      />
                    </div>

                    {/* Objective */}
                    <div>
                      <label style={labelStyle}>Objetivo Principal</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {OBJECTIVE_OPTIONS.map((opt) => {
                          const active = metaObjective === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setMetaObjective(opt.value)}
                              style={{
                                flex: 1,
                                padding: "8px 4px",
                                fontSize: 12,
                                fontWeight: 600,
                                borderRadius: 8,
                                border: active ? "1px solid rgba(125,193,40,0.4)" : "1px solid #1f2a23",
                                background: active ? "rgba(125,193,40,0.12)" : "#0f1813",
                                color: active ? "#7DC128" : "#6e7a70",
                                cursor: "pointer",
                                transition: "all .15s",
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Campaign Filter */}
                    <div>
                      <label style={labelStyle}>Filtro de Campanhas</label>
                      <textarea
                        value={metaCampaignFilter}
                        onChange={(e) => setMetaCampaignFilter(e.target.value)}
                        placeholder="Palavras-chave separadas por vírgula. Apenas campanhas cujo nome contenha algum desses termos serão incluídas nos relatórios. Deixe em branco para incluir todas as campanhas da conta."
                        style={{
                          ...inputStyle,
                          resize: "vertical",
                          minHeight: 72,
                          lineHeight: 1.5,
                          fontFamily: "inherit",
                        }}
                      />
                      <p style={{ fontSize: 11, color: "#4a5450", marginTop: 4 }}>
                        Ex: cardapio, delivery, promoção
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Managers */}
          {managers.length > 0 && (
            <div>
              <label style={labelStyle}>Gestores responsáveis</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflowY: "auto", border: "1px solid #1f2a23", borderRadius: 8, padding: "4px 0" }}>
                {managers.map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: selectedManagerIds.includes(m.id) ? "rgba(125,193,40,0.08)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedManagerIds.includes(m.id)}
                      onChange={() => toggleManager(m.id)}
                      style={{ accentColor: "#7DC128" }}
                    />
                    <span style={{ fontSize: 13, color: "#a8b3aa", flex: 1 }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: "#4a5450" }}>{m.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              style={{
                border: "1px solid #1f2a23",
                color: "#a8b3aa",
                background: "#0f1813",
                fontSize: 13,
                padding: "8px 14px",
                borderRadius: 8,
                cursor: "pointer",
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
              {loading ? "Salvando..." : client ? "Salvar" : "Criar Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
