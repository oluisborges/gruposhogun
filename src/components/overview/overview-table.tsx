"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
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

const TAG_COLORS: Record<ClientTag, string> = {
  MARMITARIA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELIVERY: "bg-red-500/10 text-red-400 border-red-500/20",
  GENERICA: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
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
          <span className="text-neutral-400 text-xs">
            {row.managerNames.join(", ") || "—"}
          </span>
        );

      case "investimento":
        return (
          <span className="text-neutral-200 tabular-nums">
            {m?.spend != null ? formatBRL(m.spend) : "—"}
          </span>
        );

      case "alcance":
        return (
          <span className="text-neutral-200 tabular-nums">
            {m?.reach != null ? formatNumber(m.reach, 0) : "—"}
          </span>
        );

      case "compras":
        return (
          <span className="text-neutral-200 tabular-nums">
            {m?.purchases != null ? formatNumber(m.purchases, 0) : "—"}
          </span>
        );

      case "receita":
        return (
          <span className="text-neutral-200 tabular-nums">
            {m?.revenue != null ? formatBRL(m.revenue) : "—"}
          </span>
        );

      case "roas": {
        const roas = m?.roas;
        const goalRoas = g?.roas;
        const color =
          roas != null && goalRoas != null
            ? roas >= goalRoas
              ? "text-green-400"
              : "text-red-400"
            : "text-neutral-200";
        return (
          <span className={cn("tabular-nums", color)}>
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
              ? "text-green-400"
              : "text-red-400"
            : "text-neutral-200";
        return (
          <span className={cn("tabular-nums", color)}>
            {cpa != null && cpa > 0 ? formatBRL(cpa) : "—"}
          </span>
        );
      }

      case "ctr":
        return (
          <span className="text-neutral-200 tabular-nums">
            {m?.ctr != null ? formatPercent(m.ctr) : "—"}
          </span>
        );

      case "cpm":
        return (
          <span className="text-neutral-200 tabular-nums">
            {m?.cpm != null ? formatBRL(m.cpm) : "—"}
          </span>
        );

      case "ultimoRelatorio":
        return (
          <span className="text-neutral-400 text-xs whitespace-nowrap">
            {row.lastReportDate ? formatBRTDate(row.lastReportDate) : "—"}
          </span>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 w-48"
        />

        <div className="flex items-center gap-1">
          {(["TODOS", "MARMITARIA", "DELIVERY", "GENERICA"] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                tagFilter === tag
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
              )}
            >
              {tag === "TODOS" ? "Todos" : TAG_LABELS[tag]}
            </button>
          ))}
        </div>

        {isPrivileged && allManagers.length > 0 && (
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-neutral-500"
          >
            <option value="TODOS">Todos os gestores</option>
            {allManagers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}

        <span className="text-xs text-neutral-500 ml-auto">
          {filtered.length} cliente(s)
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="sticky left-0 bg-neutral-950 text-left py-2 pr-4 text-xs text-neutral-500 font-medium whitespace-nowrap z-10">
                Cliente
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left py-2 px-3 text-xs text-neutral-500 font-medium whitespace-nowrap"
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
                  className="py-8 text-center text-sm text-neutral-600"
                >
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.clientId}
                  className="border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors"
                >
                  <td className="sticky left-0 bg-neutral-950 py-3 pr-4 z-10">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/clients/${row.clientId}`}
                        className="text-white font-medium hover:text-red-400 transition-colors whitespace-nowrap"
                      >
                        {row.clientName}
                      </Link>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
                          TAG_COLORS[row.tag]
                        )}
                      >
                        {TAG_LABELS[row.tag]}
                      </span>
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="py-3 px-3 whitespace-nowrap">
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
  );
}
