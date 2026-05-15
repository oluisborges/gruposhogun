"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import type { MetaInsights } from "@/lib/meta-ads/client";
import type { ClientTag } from "@prisma/client";
import type { UserSummary } from "@/types";

export interface OverviewRow {
  clientId: string;
  clientName: string;
  tag: ClientTag;
  managerNames: string[];
  lastReportDate: string | null;
  metrics: Partial<MetaInsights> | null;
  goal: { spend?: number; roas?: number; cpa?: number } | null;
}

interface OverviewTableProps {
  rows: OverviewRow[];
  currentUser: UserSummary;
}

const TAG_LABELS: Record<ClientTag, string> = {
  MARMITARIA: "Marmitaria",
  DELIVERY: "Delivery",
  GENERICA: "Genérica",
};

const TAG_STYLES: Record<ClientTag, { background: string; color: string; border: string }> = {
  MARMITARIA: { background: "rgba(232,167,58,0.12)", color: "#e8a73a", border: "rgba(232,167,58,0.25)" },
  DELIVERY: { background: "rgba(91,138,212,0.12)", color: "#5b8ad4", border: "rgba(91,138,212,0.25)" },
  GENERICA: { background: "rgba(110,122,112,0.12)", color: "#a8b3aa", border: "rgba(110,122,112,0.25)" },
};

const COLUMN_KEYS = [
  "gestores",
  "investimento",
  "alcance",
  "compras",
  "receita",
  "roas",
  "cpa",
  "ctr",
  "cpm",
  "ultimoRelatorio",
] as const;

type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  gestores: "Gestores",
  investimento: "Investimento",
  alcance: "Alcance",
  compras: "Compras",
  receita: "Receita",
  roas: "ROAS",
  cpa: "CPA",
  ctr: "CTR",
  cpm: "CPM",
  ultimoRelatorio: "Último Relatório",
};

const STORAGE_KEY = "overview-column-order";

export function OverviewTable({ rows, currentUser }: OverviewTableProps) {
  const isPrivileged = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const [columns, setColumns] = useState<ColumnKey[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ColumnKey[];
          // Validate keys
          if (Array.isArray(parsed) && parsed.every((k) => COLUMN_KEYS.includes(k))) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return [...COLUMN_KEYS];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const [tagFilter, setTagFilter] = useState<ClientTag | "TODOS">("TODOS");
  const [managerFilter, setManagerFilter] = useState<string>("TODOS");
  const [search, setSearch] = useState("");

  // Gather all managers for filter
  const allManagers = Array.from(
    new Set(rows.flatMap((r) => r.managerNames))
  ).sort();

  const filtered = rows.filter((row) => {
    if (tagFilter !== "TODOS" && row.tag !== tagFilter) return false;
    if (isPrivileged && managerFilter !== "TODOS" && !row.managerNames.includes(managerFilter))
      return false;
    if (search && !row.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function renderCell(col: ColumnKey, row: OverviewRow) {
    const m = row.metrics;
    const g = row.goal;

    switch (col) {
      case "gestores":
        return (
          <span style={{ color: "#6e7a70", fontSize: 12 }}>
            {row.managerNames.join(", ") || "—"}
          </span>
        );

      case "investimento":
        return (
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
            {m?.spend != null ? formatBRL(m.spend) : "—"}
          </span>
        );

      case "alcance":
        return (
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
            {m?.reach != null ? formatNumber(m.reach, 0) : "—"}
          </span>
        );

      case "compras":
        return (
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
            {m?.purchases != null ? formatNumber(m.purchases, 0) : "—"}
          </span>
        );

      case "receita":
        return (
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
            {m?.revenue != null ? formatBRL(m.revenue) : "—"}
          </span>
        );

      case "roas": {
        const roas = m?.roas;
        const goalRoas = g?.roas;
        const color =
          roas != null && goalRoas != null
            ? roas >= goalRoas
              ? "#7DC128"
              : "#d85a4a"
            : "#a8b3aa";
        return (
          <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13, color }}>
            {roas != null ? roas.toFixed(2) : "—"}
          </span>
        );
      }

      case "cpa": {
        const cpa = m?.cpa;
        const goalCpa = g?.cpa;
        const color =
          cpa != null && cpa > 0 && goalCpa != null
            ? cpa <= goalCpa
              ? "#7DC128"
              : "#d85a4a"
            : "#a8b3aa";
        return (
          <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13, color }}>
            {cpa != null && cpa > 0 ? formatBRL(cpa) : "—"}
          </span>
        );
      }

      case "ctr":
        return (
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
            {m?.ctr != null ? formatPercent(m.ctr) : "—"}
          </span>
        );

      case "cpm":
        return (
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
            {m?.cpm != null ? formatBRL(m.cpm) : "—"}
          </span>
        );

      case "ultimoRelatorio":
        return (
          <span
            style={{
              color: "#6e7a70",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {row.lastReportDate ? formatBRTDate(row.lastReportDate) : "—"}
          </span>
        );
    }
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
          <span style={{ color: "#6e7a70" }}>Métricas</span>
          <span style={{ color: "#4a5450" }}>/</span>
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>Overview</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "#0f1813",
              border: "1px solid #1f2a23",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              color: "#e6efe8",
              outline: "none",
              width: 200,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#7DC128")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#1f2a23")}
          />

          {/* Manager select */}
          {isPrivileged && allManagers.length > 0 && (
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              style={{
                background: "#0f1813",
                border: "1px solid #1f2a23",
                borderRadius: 8,
                padding: "7px 14px",
                fontSize: 13,
                color: "#a8b3aa",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="TODOS">Todos os gestores</option>
              {allManagers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Tag tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {(["TODOS", "MARMITARIA", "DELIVERY", "GENERICA"] as const).map((tag) => {
            const active = tagFilter === tag;
            const tagStyle = tag !== "TODOS" ? TAG_STYLES[tag as ClientTag] : null;
            return (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  border: active
                    ? `1px solid ${tagStyle?.border ?? "rgba(125,193,40,0.4)"}`
                    : "1px solid transparent",
                  background: active
                    ? (tagStyle?.background ?? "rgba(125,193,40,0.12)")
                    : "transparent",
                  color: active
                    ? (tagStyle?.color ?? "#7DC128")
                    : "#6e7a70",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {tag === "TODOS" ? "Todos" : TAG_LABELS[tag as ClientTag]}
              </button>
            );
          })}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "#4a5450",
              fontFamily: "var(--font-mono)",
            }}
          >
            {filtered.length} cliente(s)
          </span>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#141f18",
            border: "1px solid #1f2a23",
            borderRadius: 10,
            overflow: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    background: "#141f18",
                    textAlign: "left",
                    padding: "10px 16px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6e7a70",
                    fontWeight: 700,
                    borderBottom: "1px solid #1f2a23",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                  }}
                >
                  Cliente
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#6e7a70",
                      fontWeight: 700,
                      borderBottom: "1px solid #1f2a23",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {COLUMN_LABELS[col]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      fontSize: 14,
                      color: "#4a5450",
                    }}
                  >
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr
                    key={row.clientId}
                    style={{
                      borderBottom: idx === filtered.length - 1 ? "none" : "1px dashed #1f2a23",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#182219";
                      const sticky = e.currentTarget.querySelector("td[data-sticky]") as HTMLElement;
                      if (sticky) sticky.style.background = "#182219";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      const sticky = e.currentTarget.querySelector("td[data-sticky]") as HTMLElement;
                      if (sticky) sticky.style.background = "#141f18";
                    }}
                  >
                    <td
                      data-sticky="true"
                      style={{
                        position: "sticky",
                        left: 0,
                        background: "#141f18",
                        padding: "12px 16px",
                        zIndex: 5,
                        transition: "background 0.1s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Link
                          href={`/dashboard/clients/${row.clientId}`}
                          style={{
                            fontWeight: 600,
                            color: "#e6efe8",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                            fontSize: 14,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#7DC128")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#e6efe8")}
                        >
                          {row.clientName}
                        </Link>
                        <span
                          style={{
                            background: TAG_STYLES[row.tag].background,
                            color: TAG_STYLES[row.tag].color,
                            border: `1px solid ${TAG_STYLES[row.tag].border}`,
                            borderRadius: 5,
                            padding: "2px 7px",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {TAG_LABELS[row.tag]}
                        </span>
                      </div>
                    </td>
                    {columns.map((col) => (
                      <td key={col} style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        {renderCell(col, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
