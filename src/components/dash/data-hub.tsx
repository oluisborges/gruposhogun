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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-md">
            <Database className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/dash"
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl font-bold text-white">{client.name}</h1>
            </div>
            <p className="text-sm text-neutral-400">HUB de Dados</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Account selector */}
          {client.metaAccounts.length > 1 && (
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="appearance-none bg-neutral-800 border border-neutral-700 text-white text-sm rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                {client.metaAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName ?? acc.accountId}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            </div>
          )}

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 rounded-md p-1">
            {(["week", "month", "custom"] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-neutral-700 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {p === "week" ? "Semana" : p === "month" ? "Mês" : "Custom"}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span className="text-neutral-500 text-xs">–</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Account info */}
      {selectedAccount && (
        <p className="text-xs text-neutral-500">
          Conta: {selectedAccount.accountName ?? selectedAccount.accountId} · Período:{" "}
          {dateRange.since} → {dateRange.until}
        </p>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
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
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-neutral-300">
              Resumo —{" "}
              {latestReport
                ? `Último relatório (${formatBRTDate(latestReport.periodStart)})`
                : "Sem relatórios disponíveis"}
            </h2>
            {latestReport ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Investimento"
                  value={formatBRL(latestMetrics.spend ?? 0)}
                  color="blue"
                />
                <SummaryCard
                  label="Faturamento"
                  value={formatBRL(latestMetrics.revenue ?? 0)}
                  color="green"
                />
                <SummaryCard
                  label="ROAS"
                  value={`${formatNumber(latestMetrics.roas ?? 0)}x`}
                  color="yellow"
                />
                <SummaryCard
                  label="Compras"
                  value={formatNumber(latestMetrics.purchases ?? 0, 0)}
                  color="purple"
                />
              </div>
            ) : (
              <EmptyState message="Nenhum relatório encontrado para este cliente" />
            )}
          </div>
        </TabsContent>

        {/* TAB: CAMPANHAS */}
        <TabsContent value="campanhas">
          <div className="space-y-4 pt-2">
            {campaignsLoading ? (
              <LoadingState />
            ) : campaignsError ? (
              <ErrorState message={campaignsError} onRetry={fetchCampaigns} />
            ) : campaigns.length === 0 && campaignsFetched ? (
              <EmptyState message="Nenhuma campanha encontrada no período" />
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium ${
                              campaign.status === "ACTIVE"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                            }`}
                          >
                            {campaign.status === "ACTIVE" ? "Ativa" : campaign.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white truncate">{campaign.name}</p>
                      </div>
                      {campaign.insights && (
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <Stat label="Invest." value={formatBRL(campaign.insights.spend)} />
                          <Stat label="ROAS" value={`${formatNumber(campaign.insights.roas)}x`} />
                          <Stat
                            label="Compras"
                            value={formatNumber(campaign.insights.purchases, 0)}
                          />
                          <Stat label="CPA" value={formatBRL(campaign.insights.cpa)} />
                        </div>
                      )}
                      {!campaign.insights && (
                        <span className="text-xs text-neutral-600">Sem dados no período</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: TOP ANÚNCIOS */}
        <TabsContent value="top-anuncios">
          <div className="space-y-4 pt-2">
            {topAdsLoading ? (
              <LoadingState />
            ) : topAdsError ? (
              <ErrorState message={topAdsError} onRetry={fetchTopAds} />
            ) : topAds.length === 0 && topAdsFetched ? (
              <EmptyState message="Nenhum anúncio com mínimo de 5 compras no período" />
            ) : (
              <div className="space-y-2">
                {topAds.map((ad, idx) => (
                  <div
                    key={ad.ad_id}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-red-400">#{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ad.ad_name}</p>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {ad.campaign_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <Stat label="Compras" value={formatNumber(ad.purchases, 0)} />
                        <Stat label="Receita" value={formatBRL(ad.revenue)} />
                        <Stat label="CPA" value={formatBRL(ad.cpa)} />
                        <Stat label="ROAS" value={`${formatNumber(ad.roas)}x`} />
                        <Stat
                          label="Score"
                          value={formatNumber(ad.score, 2)}
                          highlight
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: GRÁFICOS */}
        <TabsContent value="graficos">
          <div className="space-y-6 pt-2">
            {chartData.length === 0 ? (
              <EmptyState message="Sem dados de relatórios para exibir gráficos" />
            ) : (
              <>
                <ChartSection
                  title="Investimento (R$)"
                  data={chartData}
                  dataKey="spend"
                  color="#ef4444"
                  formatter={formatBRL}
                />
                <ChartSection
                  title="Faturamento (R$)"
                  data={chartData}
                  dataKey="revenue"
                  color="#22c55e"
                  formatter={formatBRL}
                />
                <ChartSection
                  title="ROAS"
                  data={chartData}
                  dataKey="roas"
                  color="#f59e0b"
                  formatter={(v) => `${formatNumber(v)}x`}
                />
                <ChartSection
                  title="Compras"
                  data={chartData}
                  dataKey="purchases"
                  color="#a855f7"
                  formatter={(v) => formatNumber(v, 0)}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* TAB: METAS */}
        <TabsContent value="metas">
          <div className="pt-2">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-white">Metas do Cliente</h2>
              </div>
              <p className="text-sm text-neutral-400 mb-4">
                Gerencie as metas mensais de {client.name} na seção de Metas.
              </p>
              <a
                href={`/dashboard/metas`}
                className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Ir para Metas
                <Target className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "green" | "yellow" | "purple" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-right">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
      <p className="text-neutral-500 text-sm">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-400">{message}</p>
        <button
          onClick={onRetry}
          className="mt-2 text-xs text-neutral-400 hover:text-white transition-colors underline"
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
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <h3 className="text-xs font-semibold text-neutral-300 mb-4">{title}</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#737373", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatter(v)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#171717",
                border: "1px solid #404040",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#fff",
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
