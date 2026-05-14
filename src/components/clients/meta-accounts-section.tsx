"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

const OBJECTIVE_COLORS: Record<AccountObjective, string> = {
  CARDAPIO: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  LEADS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  WHATSAPP: "bg-green-500/10 text-green-400 border-green-500/20",
};

export function MetaAccountsSection({ clientId, accounts: initialAccounts, userRole }: MetaAccountsSectionProps) {
  const [accounts, setAccounts] = useState<SafeMetaAccount[]>(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
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
    <div className="space-y-3">
      {accounts.length === 0 && !showForm && (
        <p className="text-sm text-neutral-500 italic">Nenhuma conta Meta Ads cadastrada</p>
      )}

      {accounts.map((account) => (
        <div
          key={account.id}
          className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-white text-sm">
                  {account.accountName ?? account.accountId}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                    OBJECTIVE_COLORS[account.objective]
                  )}
                >
                  {OBJECTIVE_LABELS[account.objective]}
                </span>
                {!account.active && (
                  <Badge variant="outline">Inativo</Badge>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">ID: {account.accountId}</p>
              {account.billingUrl && (
                <a
                  href={account.billingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Link de Cobrança
                </a>
              )}
              {account.campaignFilter.length > 0 && (
                <p className="text-xs text-neutral-600 mt-1">
                  Filtros: {account.campaignFilter.join(", ")}
                </p>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(account)}
                  disabled={togglingId === account.id}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors disabled:opacity-50",
                    account.active ? "bg-green-500 border-green-500" : "bg-neutral-700 border-neutral-700"
                  )}
                  title={account.active ? "Desativar" : "Ativar"}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      account.active ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {canEdit && (
        showForm ? (
          <div className="bg-neutral-800/50 border border-red-500/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-neutral-300">Nova Conta Meta Ads</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Account ID *</Label>
                <Input
                  value={formAccountId}
                  onChange={(e) => setFormAccountId(e.target.value)}
                  placeholder="123456789"
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Nome da Conta</Label>
                <Input
                  value={formAccountName}
                  onChange={(e) => setFormAccountName(e.target.value)}
                  placeholder="Nome"
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Token</Label>
                <Input
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  type="password"
                  placeholder="Token de acesso"
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Objetivo</Label>
                <select
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value as AccountObjective)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value="CARDAPIO">Cardápio</option>
                  <option value="LEADS">Leads</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">URL de Cobrança</Label>
                <Input
                  value={formBillingUrl}
                  onChange={(e) => setFormBillingUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Filtro de Campanhas (vírgula)</Label>
                <Input
                  value={formCampaignFilter}
                  onChange={(e) => setFormCampaignFilter(e.target.value)}
                  placeholder="camp1, camp2"
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saving || !formAccountId.trim()}
                onClick={handleAdd}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-neutral-400 hover:text-white"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2.5 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Conta Meta Ads
          </button>
        )
      )}
    </div>
  );
}
