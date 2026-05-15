"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatting";
import { inferReportType } from "@/lib/reports/generator";
import type { MetaInsights } from "@/lib/meta-ads/client";
import type { MetaAccount, Report } from "@prisma/client";

interface GenerateReportModalProps {
  clientId: string;
  accounts: Omit<MetaAccount, "tokenEncrypted">[];
  onGenerated: (report: Report) => void;
}

const REPORT_TYPE_LABELS = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  CUSTOM: "Personalizado",
};

interface MetricRow {
  label: string;
  current: string;
  previous: string;
  delta: string;
}

function formatDelta(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100.00%" : "—";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function buildMetricRows(current: MetaInsights, previous: MetaInsights): MetricRow[] {
  return [
    {
      label: "Investimento",
      current: formatBRL(current.spend),
      previous: formatBRL(previous.spend),
      delta: formatDelta(current.spend, previous.spend),
    },
    {
      label: "Alcance",
      current: formatNumber(current.reach, 0),
      previous: formatNumber(previous.reach, 0),
      delta: formatDelta(current.reach, previous.reach),
    },
    {
      label: "Impressões",
      current: formatNumber(current.impressions, 0),
      previous: formatNumber(previous.impressions, 0),
      delta: formatDelta(current.impressions, previous.impressions),
    },
    {
      label: "Cliques",
      current: formatNumber(current.clicks, 0),
      previous: formatNumber(previous.clicks, 0),
      delta: formatDelta(current.clicks, previous.clicks),
    },
    {
      label: "Compras",
      current: formatNumber(current.purchases, 0),
      previous: formatNumber(previous.purchases, 0),
      delta: formatDelta(current.purchases, previous.purchases),
    },
    {
      label: "Receita",
      current: formatBRL(current.revenue),
      previous: formatBRL(previous.revenue),
      delta: formatDelta(current.revenue, previous.revenue),
    },
    {
      label: "ROAS",
      current: current.roas.toFixed(2),
      previous: previous.roas.toFixed(2),
      delta: formatDelta(current.roas, previous.roas),
    },
    {
      label: "CPA",
      current: current.cpa > 0 ? formatBRL(current.cpa) : "—",
      previous: previous.cpa > 0 ? formatBRL(previous.cpa) : "—",
      delta:
        current.cpa > 0 && previous.cpa > 0
          ? formatDelta(current.cpa, previous.cpa)
          : "—",
    },
    {
      label: "CTR",
      current: formatPercent(current.ctr),
      previous: formatPercent(previous.ctr),
      delta: formatDelta(current.ctr, previous.ctr),
    },
    {
      label: "CPM",
      current: formatBRL(current.cpm),
      previous: formatBRL(previous.cpm),
      delta: formatDelta(current.cpm, previous.cpm),
    },
    {
      label: "Leads",
      current: formatNumber(current.leads, 0),
      previous: formatNumber(previous.leads, 0),
      delta: formatDelta(current.leads, previous.leads),
    },
    {
      label: "Mensagens",
      current: formatNumber(current.messages, 0),
      previous: formatNumber(previous.messages, 0),
      delta: formatDelta(current.messages, previous.messages),
    },
  ];
}

export function GenerateReportModal({
  clientId,
  accounts,
  onGenerated,
}: GenerateReportModalProps) {
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [metaAccountId, setMetaAccountId] = useState(accounts[0]?.id ?? "");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedReport, setGeneratedReport] = useState<Report | null>(null);
  const [currentInsights, setCurrentInsights] = useState<MetaInsights | null>(null);
  const [previousInsights, setPreviousInsights] = useState<MetaInsights | null>(null);

  const [copied, setCopied] = useState(false);

  const inferredType =
    since && until ? REPORT_TYPE_LABELS[inferReportType(new Date(since), new Date(until))] : "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, metaAccountId, since, until }),
      });

      const data = await res.json() as {
        report?: Report;
        current?: MetaInsights;
        previous?: MetaInsights;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao gerar relatório");
      }

      setGeneratedReport(data.report!);
      setCurrentInsights(data.current!);
      setPreviousInsights(data.previous!);
      onGenerated(data.report!);
      setOpen(false);
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedReport) return;
    await navigator.clipboard.writeText(generatedReport.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (accounts.length === 0) {
    return (
      <Button size="sm" disabled className="bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed">
        Sem contas Meta
      </Button>
    );
  }

  return (
    <>
      {/* Generate Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-red-600 hover:bg-red-500 text-white">
          Gerar Relatório
        </Button>

        <DialogContent className="bg-neutral-900 border border-neutral-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Gerar Relatório</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-neutral-300">Conta Meta</Label>
              <select
                value={metaAccountId}
                onChange={(e) => setMetaAccountId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName ?? acc.accountId}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-neutral-300">Data início</Label>
                <Input
                  type="date"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-neutral-300">Data fim</Label>
                <Input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="bg-neutral-800 border-neutral-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">Tipo inferido:</span>
              <span className="text-neutral-200 font-medium">{inferredType}</span>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-neutral-400 border border-neutral-700"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Buscando dados da Meta API...
                  </>
                ) : (
                  "Gerar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {generatedReport && currentInsights && previousInsights && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="bg-neutral-900 border border-neutral-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Relatório Gerado</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Period */}
              <p className="text-xs text-neutral-500">
                {REPORT_TYPE_LABELS[generatedReport.type]} •{" "}
                {new Date(generatedReport.periodStart).toLocaleDateString("pt-BR")} —{" "}
                {new Date(generatedReport.periodEnd).toLocaleDateString("pt-BR")}
              </p>

              {/* Metrics comparison table */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                  Comparativo de Métricas
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left py-1.5 text-neutral-500 font-medium">Métrica</th>
                        <th className="text-right py-1.5 px-3 text-neutral-500 font-medium">Atual</th>
                        <th className="text-right py-1.5 px-3 text-neutral-500 font-medium">Anterior</th>
                        <th className="text-right py-1.5 text-neutral-500 font-medium">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildMetricRows(currentInsights, previousInsights).map((row) => {
                        const isPositive = row.delta.startsWith("+");
                        const isNegative = row.delta.startsWith("-");
                        const deltaColor = isPositive
                          ? "text-green-400"
                          : isNegative
                          ? "text-red-400"
                          : "text-neutral-500";
                        return (
                          <tr key={row.label} className="border-b border-neutral-800/40">
                            <td className="py-1.5 text-neutral-400">{row.label}</td>
                            <td className="py-1.5 px-3 text-right text-white tabular-nums">{row.current}</td>
                            <td className="py-1.5 px-3 text-right text-neutral-500 tabular-nums">{row.previous}</td>
                            <td className={`py-1.5 text-right tabular-nums font-medium ${deltaColor}`}>{row.delta}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Report text */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                  Texto do Relatório
                </h3>
                <pre className="bg-neutral-800 border border-neutral-700 rounded-md p-3 text-xs text-neutral-200 whitespace-pre-wrap font-mono overflow-x-auto">
                  {generatedReport.content}
                </pre>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleCopy}
                  className="text-neutral-400 border border-neutral-700 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setPreviewOpen(false)}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
