"use client";

import { useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { formatBRL } from "@/lib/formatting";
import { formatBRTDateTime } from "@/lib/date-utils";
import type { ClientTag, Role } from "@prisma/client";

const TAG_STYLES: Record<ClientTag, { background: string; color: string; border: string }> = {
  MARMITARIA: { background: "rgba(232,167,58,0.12)", color: "#e8a73a", border: "rgba(232,167,58,0.25)" },
  DELIVERY: { background: "rgba(91,138,212,0.12)", color: "#5b8ad4", border: "rgba(91,138,212,0.25)" },
  GENERICA: { background: "rgba(110,122,112,0.12)", color: "#a8b3aa", border: "rgba(110,122,112,0.25)" },
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
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#0d1410" }}>
      {/* Topbar */}
      <div
        className="flex-shrink-0 flex items-center gap-5 px-7 sticky top-0 z-10"
        style={{
          height: 64,
          borderBottom: "1px solid #1f2a23",
          background: "rgba(13,20,16,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "#6e7a70" }}>Financeiro</span>
          <span style={{ color: "#4a5450" }}>/</span>
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>PIX da Semana</span>
        </div>

        {/* Week range */}
        <div
          className="ml-auto flex items-center gap-3"
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              fontSize: 13,
              color: "#a8b3aa",
            }}
          >
            {weekStart} – {weekEnd}
          </span>

          {/* Progress summary */}
          <div
            style={{
              background: "#141f18",
              border: "1px solid #1f2a23",
              borderRadius: 8,
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#7DC128", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {sentCount}
            </span>
            <span style={{ color: "#4a5450" }}>/</span>
            <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)" }}>
              {items.length}
            </span>
            <span style={{ color: "#6e7a70", fontSize: 11 }}>enviados</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px", flex: 1 }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 11,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ color: "#7DC128" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{sentCount}</span> enviados
              </span>
              <span style={{ color: "#6e7a70" }}>
                <span style={{ fontFamily: "var(--font-mono)" }}>{pendingCount}</span> pendentes
              </span>
            </div>
            <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
              {sentPct}%
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: 4,
              background: "#182219",
              borderRadius: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#7DC128",
                borderRadius: 9999,
                width: `${sentPct}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Tag filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {ALL_TAGS.map((tag) => {
            const active = tagFilter === tag;
            const tagStyle = tag !== "TODOS" ? TAG_STYLES[tag as ClientTag] : null;
            return (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  border: active
                    ? `1px solid ${tagStyle?.border ?? "rgba(125,193,40,0.4)"}`
                    : "1px solid #1f2a23",
                  background: active
                    ? (tagStyle?.background ?? "rgba(125,193,40,0.12)")
                    : "#0f1813",
                  color: active
                    ? (tagStyle?.color ?? "#7DC128")
                    : "#6e7a70",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div
          style={{
            background: "#141f18",
            border: "1px solid #1f2a23",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Cliente", "Valor PIX", "Cobrança", "Status", "Enviado por"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#6e7a70",
                      fontWeight: 700,
                      padding: "10px 16px",
                      borderBottom: "1px solid #1f2a23",
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
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "#4a5450",
                      padding: "32px 16px",
                      fontSize: 13,
                    }}
                  >
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const sent = Boolean(item.record?.sentAt);
                  const isToggling = toggling.has(item.client.id);
                  const billingAccount = item.client.metaAccounts[0];
                  const tagStyle = TAG_STYLES[item.client.tag];
                  const isLast = idx === filtered.length - 1;

                  return (
                    <tr
                      key={item.client.id}
                      style={{
                        borderBottom: isLast ? "none" : "1px dashed #1f2a23",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#182219")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Client name + tag */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Initials avatar */}
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: "linear-gradient(135deg, #244a32, #15301f)",
                              border: "1px solid #284d36",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ color: "#9be03a", fontWeight: 700, fontSize: 12 }}>
                              {item.client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#e6efe8" }}>
                            {item.client.name}
                          </span>
                          <span
                            style={{
                              background: tagStyle.background,
                              color: tagStyle.color,
                              border: `1px solid ${tagStyle.border}`,
                              borderRadius: 5,
                              padding: "2px 7px",
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {item.client.tag}
                          </span>
                        </div>
                      </td>

                      {/* PIX value */}
                      <td style={{ padding: "12px 16px" }}>
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
                            style={{
                              width: 100,
                              background: "#0f1813",
                              border: "1px solid #7DC128",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 13,
                              color: "#e6efe8",
                              outline: "none",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: 13,
                              fontFamily: "var(--font-mono)",
                              fontVariantNumeric: "tabular-nums",
                              color: item.client.pixValue ? "#e6efe8" : "#4a5450",
                              cursor: canEditValue ? "pointer" : "default",
                            }}
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
                      <td style={{ padding: "12px 16px" }}>
                        {billingAccount ? (
                          <a
                            href={getBillingUrl(billingAccount)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              color: "#5b8ad4",
                              textDecoration: "none",
                            }}
                          >
                            Ver cobrança
                            <ExternalLink style={{ width: 12, height: 12 }} />
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: "#4a5450" }}>—</span>
                        )}
                      </td>

                      {/* Toggle */}
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => handleToggle(item.client.id)}
                          disabled={isToggling}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            border: "none",
                            cursor: isToggling ? "not-allowed" : "pointer",
                            opacity: isToggling ? 0.5 : 1,
                            background: sent ? "#7DC128" : "#182219",
                            color: sent ? "#0a1408" : "#6e7a70",
                            transition: "all 0.15s",
                            minWidth: 90,
                          }}
                        >
                          {sent ? "Enviado" : "Pendente"}
                        </button>
                      </td>

                      {/* Sent by */}
                      <td style={{ padding: "12px 16px" }}>
                        {item.record?.sentAt ? (
                          <div>
                            <p style={{ fontSize: 13, color: "#a8b3aa", fontWeight: 500 }}>
                              {item.record.sentBy?.name ?? "—"}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: "#6e7a70",
                                fontFamily: "var(--font-mono)",
                                fontVariantNumeric: "tabular-nums",
                                marginTop: 2,
                              }}
                            >
                              {formatBRTDateTime(item.record.sentAt)}
                            </p>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "#4a5450" }}>—</span>
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
    </div>
  );
}
