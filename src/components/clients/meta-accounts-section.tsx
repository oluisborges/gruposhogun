"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import type { MetaAccount, AccountObjective, Role } from "@prisma/client";

type SafeMetaAccount = Omit<MetaAccount, "tokenEncrypted">;

interface MetaAccountsSectionProps {
  clientId: string;
  accounts: SafeMetaAccount[];
  userRole: Role;
}

const OBJECTIVE_LABELS: Record<AccountObjective, string> = {
  CARDAPIO: "Cardápio",
  LEADS: "Leads",
  WHATSAPP: "WhatsApp",
};

const OBJECTIVE_COLORS: Record<AccountObjective, { bg: string; text: string }> = {
  CARDAPIO: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
  LEADS: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
  WHATSAPP: { bg: "rgba(125,193,40,0.08)", text: "#9be03a" },
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
  letterSpacing: ".1em",
  color: "#6e7a70",
  marginBottom: 6,
};

export function MetaAccountsSection({ clientId, accounts: initialAccounts, userRole }: MetaAccountsSectionProps) {
  const [accounts, setAccounts] = useState<SafeMetaAccount[]>(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formAccountId, setFormAccountId] = useState("");
  const [formAccountName, setFormAccountName] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formObjective, setFormObjective] = useState<AccountObjective>("CARDAPIO");
  const [formBillingUrl, setFormBillingUrl] = useState("");
  const [formCampaignFilter, setFormCampaignFilter] = useState("");

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  async function handleAdd() {
    if (!formAccountId.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/meta-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: formAccountId.trim(),
        accountName: formAccountName.trim() || undefined,
        token: formToken || undefined,
        objective: formObjective,
        billingUrl: formBillingUrl.trim() || undefined,
        campaignFilter: formCampaignFilter
          ? formCampaignFilter.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    });
    if (res.ok) {
      const created = await res.json() as SafeMetaAccount;
      setAccounts((prev) => [...prev, created]);
      setShowForm(false);
      setFormAccountId("");
      setFormAccountName("");
      setFormToken("");
      setFormObjective("CARDAPIO");
      setFormBillingUrl("");
      setFormCampaignFilter("");
    }
    setSaving(false);
  }

  async function handleToggle(account: SafeMetaAccount) {
    setTogglingId(account.id);
    const res = await fetch(`/api/clients/${clientId}/meta-accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !account.active }),
    });
    if (res.ok) {
      const updated = await res.json() as SafeMetaAccount;
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
    }
    setTogglingId(null);
  }

  async function handleDelete(accountId: string) {
    if (!confirm("Remover esta conta Meta Ads?")) return;
    await fetch(`/api/clients/${clientId}/meta-accounts/${accountId}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {accounts.length === 0 && !showForm && (
        <p style={{ fontSize: 13, color: "#4a5450", fontStyle: "italic" }}>Nenhuma conta Meta Ads cadastrada</p>
      )}

      {accounts.map((account) => (
        <div
          key={account.id}
          style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 16 }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{ fontWeight: 600, color: "#e6efe8", fontSize: 13 }}>
                  {account.accountName ?? account.accountId}
                </p>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  borderRadius: 20,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  background: OBJECTIVE_COLORS[account.objective].bg,
                  color: OBJECTIVE_COLORS[account.objective].text,
                }}>
                  {OBJECTIVE_LABELS[account.objective]}
                </span>
                {!account.active && (
                  <span style={{
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
                  }}>Inativo</span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#6e7a70", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                ID: {account.accountId}
              </p>
              {account.billingUrl && (
                <a
                  href={account.billingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7DC128", marginTop: 4, textDecoration: "none" }}
                >
                  <ExternalLink style={{ width: 11, height: 11 }} />
                  Link de Cobrança
                </a>
              )}
              {account.campaignFilter.length > 0 && (
                <p style={{ fontSize: 11, color: "#4a5450", marginTop: 4 }}>
                  Filtros: {account.campaignFilter.join(", ")}
                </p>
              )}
            </div>
            {canEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Toggle switch */}
                <button
                  onClick={() => handleToggle(account)}
                  disabled={togglingId === account.id}
                  title={account.active ? "Desativar" : "Ativar"}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    height: 20,
                    width: 36,
                    alignItems: "center",
                    borderRadius: 10,
                    border: "2px solid",
                    borderColor: account.active ? "#7DC128" : "#1f2a23",
                    background: account.active ? "#7DC128" : "#182219",
                    cursor: togglingId === account.id ? "not-allowed" : "pointer",
                    transition: "all .2s",
                    padding: 0,
                    opacity: togglingId === account.id ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      height: 14,
                      width: 14,
                      borderRadius: "50%",
                      background: "#fff",
                      transform: account.active ? "translateX(16px)" : "translateX(2px)",
                      transition: "transform .2s",
                    }}
                  />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", color: "#4a5450" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {canEdit && (
        showForm ? (
          <div style={{ background: "#141f18", border: "1px solid rgba(125,193,40,0.2)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e6efe8" }}>Nova Conta Meta Ads</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Account ID *</label>
                <input value={formAccountId} onChange={(e) => setFormAccountId(e.target.value)} placeholder="123456789" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nome da Conta</label>
                <input value={formAccountName} onChange={(e) => setFormAccountName(e.target.value)} placeholder="Nome" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Token</label>
                <input value={formToken} onChange={(e) => setFormToken(e.target.value)} type="password" placeholder="Token de acesso" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Objetivo</label>
                <select
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value as AccountObjective)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="CARDAPIO">Cardápio</option>
                  <option value="LEADS">Leads</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>URL de Cobrança</label>
                <input value={formBillingUrl} onChange={(e) => setFormBillingUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Filtro de Campanhas (vírgula)</label>
                <input value={formCampaignFilter} onChange={(e) => setFormCampaignFilter(e.target.value)} placeholder="camp1, camp2" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={saving || !formAccountId.trim()}
                onClick={handleAdd}
                style={{
                  background: saving || !formAccountId.trim() ? "#4a6a1a" : "#7DC128",
                  color: "#0a1408",
                  fontSize: 13,
                  padding: "9px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: saving || !formAccountId.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !formAccountId.trim() ? 0.7 : 1,
                }}
              >
                {saving ? "Salvando..." : "Adicionar"}
              </button>
              <button
                onClick={() => setShowForm(false)}
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
            onClick={() => setShowForm(true)}
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
            <Plus style={{ width: 14, height: 14 }} />
            Adicionar Conta Meta Ads
          </button>
        )
      )}
    </div>
  );
}
