"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatBRL, formatNumber } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import { nowBRT } from "@/lib/date-utils";
import {
  Database,
  TrendingUp,
  Star,
  BarChart2,
  Target,
  ChevronDown,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { ClientTag, Role } from "@prisma/client";

interface MetaAccountSummary {
  id: string;
  accountName: string | null;
  accountId: string;
}

interface ClientWithAccounts {
  id: string;
  name: string;
  tag: ClientTag;
  metaAccounts: MetaAccountSummary[];
}

interface UserSummary {
  id: string;
  role: Role;
}

interface ReportSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  rawData: unknown;
  createdAt: string;
}

interface DataHubProps {
  client: ClientWithAccounts;
  currentUser: UserSummary;
  recentReports: ReportSummary[];
}

interface MetricData {
  spend?: number;
  revenue?: number;
  roas?: number;
  purchases?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpm?: number;
  cpa?: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  insights?: {
    spend: number;
    revenue: number;
    purchases: number;
    roas: number;
    clicks: number;
    impressions: number;
    ctr: number;
    cpa: number;
  };
}

interface TopAd {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: number;
  purchases: number;
  revenue: number;
  clicks: number;
  cpa: number;
  roas: number;
  purchaseRate: number;
  score: number;
  thumbnail_url?: string;
}

type PeriodType = "week" | "month" | "custom";

function getDateRange(period: PeriodType, customFrom?: string, customTo?: string) {
  const now = nowBRT();
  if (period === "week") {
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    return {
      since: weekStart.toISOString().slice(0, 10),
      until: now.toISOString().slice(0, 10),
    };
  }
  if (period === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      since: monthStart.toISOString().slice(0, 10),
      until: now.toISOString().slice(0, 10),
    };
  }
  // custom
  return {
    since: customFrom ?? now.toISOString().slice(0, 10),
    until: customTo ?? now.toISOString().slice(0, 10),
  };
}

function extractRawMetrics(rawData: unknown): MetricData {
  if (!rawData || typeof rawData !== "object") return {};
  const data = rawData as Record<string, unknown>;
  return {
    spend: typeof data.spend === "number" ? data.spend : undefined,
    revenue: typeof data.revenue === "number" ? data.revenue : undefined,
    roas: typeof data.roas === "number" ? data.roas : undefined,
    purchases: typeof data.purchases === "number" ? data.purchases : undefined,
    impressions: typeof data.impressions === "number" ? data.impressions : undefined,
    clicks: typeof data.clicks === "number" ? data.clicks : undefined,
    ctr: typeof data.ctr === "number" ? data.ctr : undefined,
    cpa: typeof data.cpa === "number" ? data.cpa : undefined,
  };
}

export function DataHub({ client, currentUser: _currentUser, recentReports }: DataHubProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    client.metaAccounts[0]?.id ?? ""
  );
  const [period, setPeriod] = useState<PeriodType>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeTab, setActiveTab] = useState("inicio");

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaignsFetched, setCampaignsFetched] = useState(false);

  // Top ads state
  const [topAds, setTopAds] = useState<TopAd[]>([]);
  const [topAdsLoading, setTopAdsLoading] = useState(false);
  const [topAdsError, setTopAdsError] = useState<string | null>(null);
  const [topAdsFetched, setTopAdsFetched] = useState(false);

  const dateRange = getDateRange(period, customFrom, customTo);

  // Reset fetched state when account or period changes
  useEffect(() => {
    setCampaignsFetched(false);
    setTopAdsFetched(false);
    setCampaigns([]);
    setTopAds([]);
  }, [selectedAccountId, period, customFrom, customTo]);

  const fetchCampaigns = useCallback(async () => {
    if (!selectedAccountId) return;
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const res = await fetch(
        `/api/dash/campaigns?metaAccountId=${selectedAccountId}&since=${dateRange.since}&until=${dateRange.until}`
      );
      const json = await res.json() as { campaigns?: Campaign[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erro ao buscar campanhas");
      setCampaigns(json.campaigns ?? []);
      setCampaignsFetched(true);
    } catch (err) {
      setCampaignsError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setCampaignsLoading(false);
    }
  }, [selectedAccountId, dateRange.since, dateRange.until]);

  const fetchTopAds = useCallback(async () => {
    if (!selectedAccountId) return;
    setTopAdsLoading(true);
    setTopAdsError(null);
    try {
      const res = await fetch(
        `/api/dash/top-ads?metaAccountId=${selectedAccountId}&since=${dateRange.since}&until=${dateRange.until}`
      );
      const json = await res.json() as { ads?: TopAd[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erro ao buscar anúncios");
      setTopAds(json.ads ?? []);
      setTopAdsFetched(true);
    } catch (err) {
      setTopAdsError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setTopAdsLoading(false);
    }
  }, [selectedAccountId, dateRange.since, dateRange.until]);

  // Lazy-load on tab change
  useEffect(() => {
    if (activeTab === "campanhas" && !campaignsFetched && !campaignsLoading) {
      fetchCampaigns();
    }
    if (activeTab === "top-anuncios" && !topAdsFetched && !topAdsLoading) {
      fetchTopAds();
    }
  }, [
    activeTab,
    campaignsFetched,
    campaignsLoading,
    topAdsFetched,
    topAdsLoading,
    fetchCampaigns,
    fetchTopAds,
  ]);

  // Compute monthly summary from most recent report
  const latestReport = recentReports[0];
  const latestMetrics = latestReport ? extractRawMetrics(latestReport.rawData) : {};

  // Chart data: last 8 reports, oldest first
  const chartData = [...recentReports]
    .reverse()
    .map((r) => {
      const m = extractRawMetrics(r.rawData);
      return {
        label: formatBRTDate(r.periodStart).slice(0, 5),
        spend: m.spend ?? 0,
        revenue: m.revenue ?? 0,
        roas: m.roas ?? 0,
        purchases: m.purchases ?? 0,
      };
    });

  const selectedAccount = client.metaAccounts.find((a) => a.id === selectedAccountId);

  const inputStyle = {
    background: "#0f1813",
    border: "1px solid #1f2a23",
    borderRadius: 8,
    color: "#e6efe8",
    fontSize: 13,
    padding: "7px 12px",
    outline: "none",
    cursor: "pointer",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href="/dashboard/dash"
            style={{ color: "#6e7a70", display: "flex", alignItems: "center" }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: "#6e7a70" }}>Ferramentas</span>
            <span style={{ color: "#4a5450" }}>/</span>
            <span style={{ color: "#6e7a70" }}>HUB de Dados</span>
            <span style={{ color: "#4a5450" }}>·</span>
            <span style={{ color: "#e6efe8", fontWeight: 600 }}>{client.name}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-3">
          {/* Account selector */}
          {client.metaAccounts.length > 1 && (
            <div style={{ position: "relative" }}>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{ ...inputStyle, appearance: "none", paddingRight: 32 }}
              >
                {client.metaAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName ?? acc.accountId}
                  </option>
                ))}
              </select>
              <ChevronDown
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 14,
                  height: 14,
                  color: "#6e7a70",
                  pointerEvents: "none",
                }}
              />
            </div>
          )}

          {/* Period selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: "#0f1813",
              border: "1px solid #1f2a23",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {(["week", "month", "custom"] as PeriodType[]).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "5px 12px",
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
                  {p === "week" ? "Semana" : p === "month" ? "Mês" : "Custom"}
                </button>
              );
            })}
          </div>

          {/* Custom date range */}
          {period === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ ...inputStyle, fontSize: 12 }}
              />
              <span style={{ color: "#4a5450", fontSize: 12 }}>–</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ ...inputStyle, fontSize: 12 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Account info */}
        {selectedAccount && (
          <p style={{ fontSize: 11, color: "#6e7a70", fontFamily: "var(--font-mono)" }}>
            Conta: {selectedAccount.accountName ?? selectedAccount.accountId} · Período:{" "}
            {dateRange.since} → {dateRange.until}
          </p>
        )}

        {/* Tabs — styled with design system */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            style={{
              background: "#0f1813",
              border: "1px solid #1f2a23",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            <TabsTrigger value="inicio">
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Início
            </TabsTrigger>
            <TabsTrigger value="campanhas">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="top-anuncios">
              <Star className="w-3.5 h-3.5 mr-1.5" />
              Top Anúncios
            </TabsTrigger>
            <TabsTrigger value="graficos">
              <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="metas">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Metas
            </TabsTrigger>
          </TabsList>

          {/* TAB: INÍCIO */}
          <TabsContent value="inicio">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6e7a70",
                  fontWeight: 700,
                }}
              >
                Resumo —{" "}
                {latestReport
                  ? `Último relatório (${formatBRTDate(latestReport.periodStart)})`
                  : "Sem relatórios disponíveis"}
              </p>
              {latestReport ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Investimento" value={formatBRL(latestMetrics.spend ?? 0)} accent="#5b8ad4" />
                  <SummaryCard label="Faturamento" value={formatBRL(latestMetrics.revenue ?? 0)} accent="#7DC128" />
                  <SummaryCard label="ROAS" value={`${formatNumber(latestMetrics.roas ?? 0)}x`} accent="#e8a73a" />
                  <SummaryCard label="Compras" value={formatNumber(latestMetrics.purchases ?? 0, 0)} accent="#a855f7" />
                </div>
              ) : (
                <EmptyState message="Nenhum relatório encontrado para este cliente" />
              )}
            </div>
          </TabsContent>

          {/* TAB: CAMPANHAS */}
          <TabsContent value="campanhas">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
              {campaignsLoading ? (
                <LoadingState />
              ) : campaignsError ? (
                <ErrorState message={campaignsError} onRetry={fetchCampaigns} />
              ) : campaigns.length === 0 && campaignsFetched ? (
                <EmptyState message="Nenhuma campanha encontrada no período" />
              ) : (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    style={{
                      background: "#141f18",
                      border: "1px solid #1f2a23",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              padding: "2px 7px",
                              borderRadius: 5,
                              border: campaign.status === "ACTIVE"
                                ? "1px solid rgba(125,193,40,0.3)"
                                : "1px solid #1f2a23",
                              background: campaign.status === "ACTIVE"
                                ? "rgba(125,193,40,0.12)"
                                : "rgba(110,122,112,0.12)",
                              color: campaign.status === "ACTIVE" ? "#7DC128" : "#6e7a70",
                            }}
                          >
                            {campaign.status === "ACTIVE" ? "Ativa" : campaign.status}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#e6efe8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {campaign.name}
                        </p>
                      </div>
                      {campaign.insights && (
                        <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
                          <Stat label="Invest." value={formatBRL(campaign.insights.spend)} />
                          <Stat label="ROAS" value={`${formatNumber(campaign.insights.roas)}x`} />
                          <Stat label="Compras" value={formatNumber(campaign.insights.purchases, 0)} />
                          <Stat label="CPA" value={formatBRL(campaign.insights.cpa)} />
                        </div>
                      )}
                      {!campaign.insights && (
                        <span style={{ fontSize: 12, color: "#4a5450" }}>Sem dados no período</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB: TOP ANÚNCIOS */}
          <TabsContent value="top-anuncios">
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
              {topAdsLoading ? (
                <LoadingState />
              ) : topAdsError ? (
                <ErrorState message={topAdsError} onRetry={fetchTopAds} />
              ) : topAds.length === 0 && topAdsFetched ? (
                <EmptyState message="Nenhum anúncio com mínimo de 5 compras no período" />
              ) : (
                topAds.map((ad, idx) => (
                  <div
                    key={ad.ad_id}
                    style={{
                      background: "#141f18",
                      border: "1px solid #1f2a23",
                      borderRadius: 10,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "rgba(125,193,40,0.12)",
                          border: "1px solid rgba(125,193,40,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#7DC128" }}>#{idx + 1}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#e6efe8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ad.ad_name}
                        </p>
                        <p style={{ fontSize: 11, color: "#6e7a70", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                          {ad.campaign_name}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
                        <Stat label="Compras" value={formatNumber(ad.purchases, 0)} />
                        <Stat label="Receita" value={formatBRL(ad.revenue)} />
                        <Stat label="CPA" value={formatBRL(ad.cpa)} />
                        <Stat label="ROAS" value={`${formatNumber(ad.roas)}x`} />
                        <Stat label="Score" value={formatNumber(ad.score, 2)} highlight />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB: GRÁFICOS */}
          <TabsContent value="graficos">
            <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
              {chartData.length === 0 ? (
                <EmptyState message="Sem dados de relatórios para exibir gráficos" />
              ) : (
                <>
                  <ChartSection title="Investimento (R$)" data={chartData} dataKey="spend" color="#5b8ad4" formatter={formatBRL} />
                  <ChartSection title="Faturamento (R$)" data={chartData} dataKey="revenue" color="#7DC128" formatter={formatBRL} />
                  <ChartSection title="ROAS" data={chartData} dataKey="roas" color="#e8a73a" formatter={(v) => `${formatNumber(v)}x`} />
                  <ChartSection title="Compras" data={chartData} dataKey="purchases" color="#a855f7" formatter={(v) => formatNumber(v, 0)} />
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB: METAS */}
          <TabsContent value="metas">
            <div style={{ paddingTop: 8 }}>
              <div
                style={{
                  background: "#141f18",
                  border: "1px solid #1f2a23",
                  borderRadius: 10,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Target style={{ width: 16, height: 16, color: "#7DC128" }} />
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "#e6efe8" }}>Metas do Cliente</h2>
                </div>
                <p style={{ fontSize: 13, color: "#a8b3aa", marginBottom: 16 }}>
                  Gerencie as metas mensais de {client.name} na seção de Metas.
                </p>
                <a
                  href="/dashboard/metas"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    color: "#7DC128",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Ir para Metas
                  <Target style={{ width: 14, height: 14 }} />
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Sub-components

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        background: "#141f18",
        border: "1px solid #1f2a23",
        borderRadius: 10,
        padding: 16,
      }}
    >
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
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 700,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: 11, color: "#6e7a70", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{label}</p>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          color: highlight ? "#7DC128" : "#a8b3aa",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
      <Loader2 style={{ width: 24, height: 24, color: "#7DC128", animation: "spin 1s linear infinite" }} />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "#141f18",
        border: "1px solid #1f2a23",
        borderRadius: 10,
        padding: 32,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 14, color: "#4a5450" }}>{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        background: "rgba(216,90,74,0.08)",
        border: "1px solid rgba(216,90,74,0.2)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <AlertCircle style={{ width: 16, height: 16, color: "#d85a4a", flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ fontSize: 13, color: "#d85a4a" }}>{message}</p>
        <button
          onClick={onRetry}
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#6e7a70",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

interface ChartDataPoint {
  label: string;
  spend: number;
  revenue: number;
  roas: number;
  purchases: number;
}

function ChartSection({
  title,
  data,
  dataKey,
  color,
  formatter,
}: {
  title: string;
  data: ChartDataPoint[];
  dataKey: keyof ChartDataPoint;
  color: string;
  formatter: (v: number) => string;
}) {
  return (
    <div
      style={{
        background: "#141f18",
        border: "1px solid #1f2a23",
        borderRadius: 10,
        padding: 20,
      }}
    >
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#6e7a70",
          marginBottom: 16,
        }}
      >
        {title}
      </h3>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2a23" strokeOpacity={0.8} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6e7a70", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6e7a70", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatter(v)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a100c",
                border: "1px solid #28342a",
                borderRadius: 8,
                fontSize: 12,
                color: "#e6efe8",
              }}
              formatter={(value: number) => [formatter(value), title]}
            />
            <Line
              type="monotone"
              dataKey={dataKey as string}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
