"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import type { ClientTag, Role } from "@prisma/client";
import type { MetaInsights } from "@/lib/meta-ads/client";

interface ReportWithMetrics {
  id: string;
  clientId: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  metrics: Partial<MetaInsights>;
}

interface ClientSummary {
  id: string;
  name: string;
  tag: ClientTag;
}

interface UserSummary {
  id: string;
  role: Role;
}

interface GraficosBoardProps {
  reports: ReportWithMetrics[];
  clients: ClientSummary[];
  currentUser: UserSummary;
}

type MetricKey = "spend" | "roas" | "cpa" | "purchases" | "revenue" | "reach" | "ctr" | "cpm";

const METRIC_OPTIONS: { key: MetricKey; label: string; format: (v: number) => string }[] = [
  { key: "spend", label: "Investimento", format: formatBRL },
  { key: "roas", label: "ROAS", format: (v) => `${formatNumber(v)}x` },
  { key: "cpa", label: "CPA", format: formatBRL },
  { key: "purchases", label: "Compras", format: (v) => formatNumber(v, 0) },
  { key: "revenue", label: "Receita", format: formatBRL },
  { key: "reach", label: "Alcance", format: (v) => formatNumber(v, 0) },
  { key: "ctr", label: "CTR", format: formatPercent },
  { key: "cpm", label: "CPM", format: formatBRL },
];

const LINE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

type ChartType = "line" | "bar";

export function GraficosBoard({ reports, clients, currentUser }: GraficosBoardProps) {
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set(clients.map((c) => c.id)));
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("spend");
  const [chartType, setChartType] = useState<ChartType>("line");

  const metricOption = METRIC_OPTIONS.find((m) => m.key === selectedMetric)!;

  // Build chart data — group by periodStart
  const chartData = useMemo(() => {
    const filteredReports = reports.filter((r) => selectedClients.has(r.clientId));

    // Collect all dates
    const dateSet = new Set(filteredReports.map((r) => r.periodStart));
    const dates = Array.from(dateSet).sort();

    return dates.map((date) => {
      const point: Record<string, string | number> = {
        date: formatBRTDate(date),
      };
      for (const client of clients) {
        if (selectedClients.has(client.id)) {
          const rep = filteredReports.find(
            (r) => r.clientId === client.id && r.periodStart === date
          );
          point[client.id] = rep?.metrics[selectedMetric] ?? 0;
        }
      }
      return point;
    });
  }, [reports, clients, selectedClients, selectedMetric]);

  function toggleClient(id: string) {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllClients() {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set([clients[0]?.id].filter(Boolean)));
    } else {
      setSelectedClients(new Set(clients.map((c) => c.id)));
    }
  }

  const clientColors = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c, i) => {
      map[c.id] = LINE_COLORS[i % LINE_COLORS.length];
    });
    return map;
  }, [clients]);

  const selectedClientList = clients.filter((c) => selectedClients.has(c.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Histórico & Gráficos</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Evolução de métricas por cliente ao longo do tempo
        </p>
      </div>

      {/* Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
        {/* Metric selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-500">Métrica</label>
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedMetric(opt.key)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  selectedMetric === opt.key
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-500">Tipo de gráfico</label>
          <div className="flex gap-2">
            {(["line", "bar"] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  chartType === t
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
                }`}
              >
                {t === "line" ? "Linha" : "Barra"}
              </button>
            ))}
          </div>
        </div>

        {/* Client filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-500">Clientes</label>
            <button
              onClick={toggleAllClients}
              className="text-xs text-neutral-500 hover:text-white transition-colors"
            >
              {selectedClients.size === clients.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleClient(c.id)}
                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                  selectedClients.has(c.id)
                    ? "border-transparent text-white"
                    : "bg-neutral-800 border-neutral-700 text-neutral-600"
                }`}
                style={
                  selectedClients.has(c.id)
                    ? { backgroundColor: clientColors[c.id] + "33", borderColor: clientColors[c.id] + "80", color: clientColors[c.id] }
                    : {}
                }
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-neutral-600">
            Nenhum dado disponível para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "line" ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#404040" }}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#404040" }}
                  tickFormatter={(v: number) => metricOption.format(v)}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "6px",
                    color: "#e5e5e5",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    metricOption.format(value),
                    clients.find((c) => c.id === name)?.name ?? name,
                  ]}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "#a3a3a3", fontSize: "12px" }}>
                      {clients.find((c) => c.id === value)?.name ?? value}
                    </span>
                  )}
                />
                {selectedClientList.map((c) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={c.id}
                    stroke={clientColors[c.id]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: clientColors[c.id] }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#404040" }}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#404040" }}
                  tickFormatter={(v: number) => metricOption.format(v)}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "6px",
                    color: "#e5e5e5",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    metricOption.format(value),
                    clients.find((c) => c.id === name)?.name ?? name,
                  ]}
                />
                <Legend
                  formatter={(value: string) => (
                    <span style={{ color: "#a3a3a3", fontSize: "12px" }}>
                      {clients.find((c) => c.id === value)?.name ?? value}
                    </span>
                  )}
                />
                {selectedClientList.map((c) => (
                  <Bar
                    key={c.id}
                    dataKey={c.id}
                    fill={clientColors[c.id]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
