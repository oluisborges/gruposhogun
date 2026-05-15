"use client";

import { useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/formatting";
import { formatBRTDateTime } from "@/lib/date-utils";
import type { ClientTag, Role } from "@prisma/client";

const TAG_COLORS: Record<ClientTag, string> = {
  MARMITARIA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELIVERY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  GENERICA: "bg-neutral-500/10 text-neutral-400 border-neutral-500/30",
};

interface PixItemClient {
  id: string;
  name: string;
  tag: ClientTag;
  pixValue: number | null;
  metaAccounts: { billingUrl: string | null; accountId: string }[];
}

interface PixRecord {
  id: string;
  sentAt: string | null;
  sentById: string | null;
  sentBy?: { id: string; name: string } | null;
}

interface PixItem {
  client: PixItemClient;
  record: PixRecord | null;
}

interface UserSummary {
  id: string;
  role: Role;
}

interface PixBoardProps {
  items: PixItem[];
  currentUser: UserSummary;
  weekStart: string;
  weekEnd: string;
}

const ALL_TAGS: (ClientTag | "TODOS")[] = ["TODOS", "MARMITARIA", "DELIVERY", "GENERICA"];

export function PixBoard({ items: initialItems, currentUser, weekStart, weekEnd }: PixBoardProps) {
  const [items, setItems] = useState<PixItem[]>(initialItems);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<ClientTag | "TODOS">("TODOS");

  const canEditValue = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const filtered = tagFilter === "TODOS"
    ? items
    : items.filter((i) => i.client.tag === tagFilter);

  const sentCount = items.filter((i) => i.record?.sentAt).length;
  const pendingCount = items.length - sentCount;
  const sentPct = items.length > 0 ? Math.round((sentCount / items.length) * 100) : 0;

  const handleToggle = useCallback(async (clientId: string) => {
    setToggling((prev) => new Set(prev).add(clientId));
    try {
      const res = await fetch(`/api/pix/${clientId}`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json() as PixRecord;
        setItems((prev) =>
          prev.map((item) =>
            item.client.id === clientId
              ? { ...item, record: updated }
              : item
          )
        );
      }
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  }, []);

  const handleValueSave = useCallback(async (clientId: string) => {
    const val = parseFloat(editValue.replace(",", "."));
    if (isNaN(val)) {
      setEditingValue(null);
      return;
    }
    try {
      const res = await fetch(`/api/pix/${clientId}/value`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixValue: val }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.client.id === clientId
              ? { ...item, client: { ...item.client, pixValue: val } }
              : item
          )
        );
      }
    } finally {
      setEditingValue(null);
    }
  }, [editValue]);

  function getBillingUrl(account: { billingUrl: string | null; accountId: string }): string {
    if (account.billingUrl) return account.billingUrl;
    return `https://adsmanager.facebook.com/billing/payment_activity?act=${account.accountId}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">PIX da Semana</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {weekStart} – {weekEnd}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-neutral-500 inline-block" />
            Total: {items.length}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded px-2 py-1 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Enviados: {sentCount}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 text-xs text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            Pendentes: {pendingCount}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{sentCount}/{items.length} enviados</span>
          <span>{sentPct}%</span>
        </div>
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${sentPct}%` }}
          />
        </div>
      </div>

      {/* Tag filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setTagFilter(tag)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              tagFilter === tag
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Cliente</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Valor PIX</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Cobrança</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Enviado por</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-neutral-600 py-8 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const sent = Boolean(item.record?.sentAt);
                const isToggling = toggling.has(item.client.id);
                const billingAccount = item.client.metaAccounts[0];

                return (
                  <tr key={item.client.id} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/30 transition-colors">
                    {/* Client name + tag */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{item.client.name}</span>
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${TAG_COLORS[item.client.tag]}`}>
                          {item.client.tag}
                        </span>
                      </div>
                    </td>

                    {/* PIX value */}
                    <td className="px-4 py-3">
                      {canEditValue && editingValue === item.client.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleValueSave(item.client.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleValueSave(item.client.id);
                            if (e.key === "Escape") setEditingValue(null);
                          }}
                          autoFocus
                          className="w-24 bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 text-sm text-white outline-none focus:border-red-500"
                        />
                      ) : (
                        <span
                          className={`text-sm ${canEditValue ? "cursor-pointer hover:text-red-400 transition-colors" : ""} ${item.client.pixValue ? "text-white" : "text-neutral-600"}`}
                          onClick={() => {
                            if (canEditValue) {
                              setEditingValue(item.client.id);
                              setEditValue(item.client.pixValue?.toString() ?? "");
                            }
                          }}
                        >
                          {item.client.pixValue ? formatBRL(item.client.pixValue) : "—"}
                        </span>
                      )}
                    </td>

                    {/* Billing link */}
                    <td className="px-4 py-3">
                      {billingAccount ? (
                        <a
                          href={getBillingUrl(billingAccount)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Ver cobrança
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-600">—</span>
                      )}
                    </td>

                    {/* Toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(item.client.id)}
                        disabled={isToggling}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          sent ? "bg-green-500" : "bg-neutral-700"
                        } ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            sent ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className={`ml-2 text-xs ${sent ? "text-green-400" : "text-neutral-500"}`}>
                        {sent ? "Enviado" : "Pendente"}
                      </span>
                    </td>

                    {/* Sent by */}
                    <td className="px-4 py-3">
                      {item.record?.sentAt ? (
                        <div>
                          <p className="text-xs text-neutral-300">
                            {item.record.sentBy?.name ?? "—"}
                          </p>
                          <p className="text-xs text-neutral-600">
                            {formatBRTDateTime(item.record.sentAt)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
