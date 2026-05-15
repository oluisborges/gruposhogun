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

// Design system multi-client colors
const LINE_COLORS = [
  "#7DC128", // lime
  "#e8a73a", // warn
  "#d85a4a", // bad/red
  "#5b8ad4", // blue
  "#9be03a", // lime-2
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
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

  const tooltipStyle = {
    backgroundColor: "#0a100c",
    border: "1px solid #28342a",
    borderRadius: 8,
    color: "#e6efe8",
    fontSize: 12,
  };

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
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>Histórico & Gráficos</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Filter bar */}
        <div
          style={{
            background: "#141f18",
            border: "1px solid #1f2a23",
            borderRadius: 10,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Metric selector */}
          <div>
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#6e7a70",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Métrica
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {METRIC_OPTIONS.map((opt) => {
                const active = selectedMetric === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedMetric(opt.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      fontSize: 12,
                      fontWeight: 600,
                      border: active ? "1px solid rgba(125,193,40,0.4)" : "1px solid #1f2a23",
                      background: active ? "rgba(125,193,40,0.12)" : "#0f1813",
                      color: active ? "#7DC128" : "#6e7a70",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart type + client filter in row */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {/* Chart type toggle */}
            <div>
              <p
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6e7a70",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Tipo de Gráfico
              </p>
              <div
                style={{
                  display: "flex",
                  background: "#0f1813",
                  border: "1px solid #1f2a23",
                  borderRadius: 8,
                  padding: 3,
                  gap: 2,
                }}
              >
                {(["line", "bar"] as ChartType[]).map((t) => {
                  const active = chartType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: "none",
                        background: active ? "#1A3D2B" : "transparent",
                        color: active ? "#e6efe8" : "#6e7a70",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {t === "line" ? "Linha" : "Barra"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Client filter */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6e7a70",
                    fontWeight: 700,
                  }}
                >
                  Clientes
                </p>
                <button
                  onClick={toggleAllClients}
                  style={{ fontSize: 11, color: "#6e7a70", background: "none", border: "none", cursor: "pointer" }}
                >
                  {selectedClients.size === clients.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {clients.map((c) => {
                  const active = selectedClients.has(c.id);
                  const color = clientColors[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleClient(c.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background: active ? `${color}22` : "#0f1813",
                        border: active ? `1px solid ${color}66` : "1px solid #1f2a23",
                        color: active ? color : "#4a5450",
                      }}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div
          style={{
            background: "#141f18",
            border: "1px solid #1f2a23",
            borderRadius: 10,
            padding: 20,
          }}
        >
          {chartData.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 300,
                color: "#4a5450",
                fontSize: 14,
              }}
            >
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a23" strokeOpacity={0.8} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6e7a70", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2a23" }}
                  />
                  <YAxis
                    tick={{ fill: "#6e7a70", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2a23" }}
                    tickFormatter={(v: number) => metricOption.format(v)}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      metricOption.format(value),
                      clients.find((c) => c.id === name)?.name ?? name,
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ color: "#a8b3aa", fontSize: 12 }}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a23" strokeOpacity={0.8} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6e7a70", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2a23" }}
                  />
                  <YAxis
                    tick={{ fill: "#6e7a70", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#1f2a23" }}
                    tickFormatter={(v: number) => metricOption.format(v)}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      metricOption.format(value),
                      clients.find((c) => c.id === name)?.name ?? name,
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ color: "#a8b3aa", fontSize: 12 }}>
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
    </div>
  );
}
