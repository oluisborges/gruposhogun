import { ReportType, AccountObjective } from "@prisma/client";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import type { MetaInsights } from "@/lib/meta-ads/client";

export function inferReportType(start: Date, end: Date): ReportType {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // 7 days (inclusive: start to end = 6 days diff + 1)
  if (diffDays === 6 && start.getDay() === 0) {
    // Starts Sunday, ends Saturday
    const endDay = end.getDay();
    if (endDay === 6) return "WEEKLY";
  }

  // Monthly: starts on day 1, ends on last day of month
  if (start.getDate() === 1) {
    const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    if (end.getDate() === lastDay && start.getMonth() === end.getMonth()) {
      return "MONTHLY";
    }
  }

  return "CUSTOM";
}

function delta(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100.00%" : "—";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

interface ReportParams {
  clientName: string;
  accountName: string;
  objective: AccountObjective;
  period: { start: Date; end: Date };
  current: MetaInsights;
  previous?: MetaInsights;
}

function line(label: string, value: string, prev?: string, diff?: string): string {
  if (prev !== undefined && diff !== undefined) {
    return `${label}: ${value} (anterior: ${prev} | var: ${diff})`;
  }
  return `${label}: ${value}`;
}

export function formatReport(params: ReportParams): string {
  const { clientName, accountName, objective, period, current, previous } = params;

  const periodStr = `${formatBRTDate(period.start)} a ${formatBRTDate(period.end)}`;
  const lines: string[] = [];

  lines.push(`RELATORIO DE DESEMPENHO — ${clientName.toUpperCase()}`);
  lines.push(`Conta: ${accountName}`);
  lines.push(`Periodo: ${periodStr}`);
  lines.push("");

  if (objective === "CARDAPIO") {
    lines.push("RESULTADOS — CARDAPIO / E-COMMERCE");
    lines.push("");
    lines.push(
      line(
        "Investimento",
        formatBRL(current.spend),
        previous ? formatBRL(previous.spend) : undefined,
        previous ? delta(current.spend, previous.spend) : undefined
      )
    );
    lines.push(
      line(
        "Alcance",
        formatNumber(current.reach, 0),
        previous ? formatNumber(previous.reach, 0) : undefined,
        previous ? delta(current.reach, previous.reach) : undefined
      )
    );
    lines.push(
      line(
        "Visualizacoes de conteudo",
        formatNumber(current.viewContent, 0),
        previous ? formatNumber(previous.viewContent, 0) : undefined,
        previous ? delta(current.viewContent, previous.viewContent) : undefined
      )
    );
    lines.push(
      line(
        "Adicoes ao carrinho",
        formatNumber(current.addToCart, 0),
        previous ? formatNumber(previous.addToCart, 0) : undefined,
        previous ? delta(current.addToCart, previous.addToCart) : undefined
      )
    );
    lines.push(
      line(
        "Compras",
        formatNumber(current.purchases, 0),
        previous ? formatNumber(previous.purchases, 0) : undefined,
        previous ? delta(current.purchases, previous.purchases) : undefined
      )
    );
    lines.push(
      line(
        "Receita",
        formatBRL(current.revenue),
        previous ? formatBRL(previous.revenue) : undefined,
        previous ? delta(current.revenue, previous.revenue) : undefined
      )
    );
    lines.push(
      line(
        "ROAS",
        current.roas.toFixed(2),
        previous ? previous.roas.toFixed(2) : undefined,
        previous ? delta(current.roas, previous.roas) : undefined
      )
    );
    lines.push(
      line(
        "CPA (custo por compra)",
        current.cpa > 0 ? formatBRL(current.cpa) : "—",
        previous ? (previous.cpa > 0 ? formatBRL(previous.cpa) : "—") : undefined,
        previous && current.cpa > 0 && previous.cpa > 0
          ? delta(current.cpa, previous.cpa)
          : undefined
      )
    );
  } else if (objective === "LEADS") {
    lines.push("RESULTADOS — GERACAO DE LEADS");
    lines.push("");
    lines.push(
      line(
        "Investimento",
        formatBRL(current.spend),
        previous ? formatBRL(previous.spend) : undefined,
        previous ? delta(current.spend, previous.spend) : undefined
      )
    );
    lines.push(
      line(
        "Alcance",
        formatNumber(current.reach, 0),
        previous ? formatNumber(previous.reach, 0) : undefined,
        previous ? delta(current.reach, previous.reach) : undefined
      )
    );
    lines.push(
      line(
        "Cliques",
        formatNumber(current.clicks, 0),
        previous ? formatNumber(previous.clicks, 0) : undefined,
        previous ? delta(current.clicks, previous.clicks) : undefined
      )
    );
    lines.push(
      line(
        "Leads",
        formatNumber(current.leads, 0),
        previous ? formatNumber(previous.leads, 0) : undefined,
        previous ? delta(current.leads, previous.leads) : undefined
      )
    );
    lines.push(
      line(
        "Custo por lead",
        current.costPerLead > 0 ? formatBRL(current.costPerLead) : "—",
        previous ? (previous.costPerLead > 0 ? formatBRL(previous.costPerLead) : "—") : undefined,
        previous && current.costPerLead > 0 && previous.costPerLead > 0
          ? delta(current.costPerLead, previous.costPerLead)
          : undefined
      )
    );
  } else {
    // WHATSAPP
    lines.push("RESULTADOS — MENSAGENS / WHATSAPP");
    lines.push("");
    lines.push(
      line(
        "Investimento",
        formatBRL(current.spend),
        previous ? formatBRL(previous.spend) : undefined,
        previous ? delta(current.spend, previous.spend) : undefined
      )
    );
    lines.push(
      line(
        "Alcance",
        formatNumber(current.reach, 0),
        previous ? formatNumber(previous.reach, 0) : undefined,
        previous ? delta(current.reach, previous.reach) : undefined
      )
    );
    lines.push(
      line(
        "Cliques",
        formatNumber(current.clicks, 0),
        previous ? formatNumber(previous.clicks, 0) : undefined,
        previous ? delta(current.clicks, previous.clicks) : undefined
      )
    );
    lines.push(
      line(
        "Mensagens iniciadas",
        formatNumber(current.messages, 0),
        previous ? formatNumber(previous.messages, 0) : undefined,
        previous ? delta(current.messages, previous.messages) : undefined
      )
    );
    lines.push(
      line(
        "Custo por mensagem",
        current.costPerMessage > 0 ? formatBRL(current.costPerMessage) : "—",
        previous
          ? previous.costPerMessage > 0
            ? formatBRL(previous.costPerMessage)
            : "—"
          : undefined,
        previous && current.costPerMessage > 0 && previous.costPerMessage > 0
          ? delta(current.costPerMessage, previous.costPerMessage)
          : undefined
      )
    );
  }

  lines.push("");
  lines.push("METRICAS GERAIS");
  lines.push("");
  lines.push(
    line(
      "CTR",
      formatPercent(current.ctr),
      previous ? formatPercent(previous.ctr) : undefined,
      previous ? delta(current.ctr, previous.ctr) : undefined
    )
  );
  lines.push(
    line(
      "CPM",
      formatBRL(current.cpm),
      previous ? formatBRL(previous.cpm) : undefined,
      previous ? delta(current.cpm, previous.cpm) : undefined
    )
  );
  lines.push(
    line(
      "CPC",
      current.cpc > 0 ? formatBRL(current.cpc) : "—",
      previous ? (previous.cpc > 0 ? formatBRL(previous.cpc) : "—") : undefined,
      previous && current.cpc > 0 && previous.cpc > 0
        ? delta(current.cpc, previous.cpc)
        : undefined
    )
  );
  lines.push(
    line(
      "Frequencia",
      formatNumber(current.frequency),
      previous ? formatNumber(previous.frequency) : undefined,
      previous ? delta(current.frequency, previous.frequency) : undefined
    )
  );

  return lines.join("\n");
}
