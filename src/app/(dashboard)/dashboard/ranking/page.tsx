import { requireCoordinator } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { nowBRT } from "@/lib/date-utils";
import { RankingBoard } from "@/components/ranking/ranking-board";
import type { MetaInsights } from "@/lib/meta-ads/client";

type Medal = "gold" | "silver" | "bronze";

interface RankingMetrics {
  roas: number;
  cpa: number;
  revenue: number;
  avgTicket: number;
  conversionRate: number;
  cpm: number;
}

interface RankingMedals {
  roas?: Medal;
  cpa?: Medal;
  revenue?: Medal;
  avgTicket?: Medal;
  conversionRate?: Medal;
  cpm?: Medal;
}

interface RankingEntry {
  userId: string;
  userName: string;
  metrics: RankingMetrics;
  medals: RankingMedals;
  totalPoints: number;
}

const MEDAL_POINTS: Record<Medal, number> = { gold: 5, silver: 3, bronze: 1 };

function rankMetric(
  entries: RankingEntry[],
  key: keyof RankingMetrics,
  higherIsBetter: boolean
): void {
  const sorted = [...entries].sort((a, b) =>
    higherIsBetter
      ? b.metrics[key] - a.metrics[key]
      : a.metrics[key] - b.metrics[key]
  );
  const medals: Medal[] = ["gold", "silver", "bronze"];
  sorted.slice(0, 3).forEach((entry, idx) => {
    const found = entries.find((e) => e.userId === entry.userId);
    if (found) {
      found.medals[key] = medals[idx];
      found.totalPoints += MEDAL_POINTS[medals[idx]];
    }
  });
}

interface RawData {
  current?: Partial<MetaInsights>;
}

export default async function RankingPage() {
  await requireCoordinator();

  const now = nowBRT();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", active: true },
    select: { id: true, name: true },
  });

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const entries: RankingEntry[] = await Promise.all(
    managers.map(async (manager) => {
      const managedClients = await prisma.clientManager.findMany({
        where: { userId: manager.id },
        select: { clientId: true },
      });
      const clientIds = managedClients.map((m) => m.clientId);

      const reports = await prisma.report.findMany({
        where: {
          clientId: { in: clientIds },
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        select: { rawData: true },
      });

      let spend = 0, revenue = 0, purchases = 0, clicks = 0, impressions = 0;
      for (const report of reports) {
        const raw = report.rawData as RawData | null;
        const current = raw?.current;
        if (!current) continue;
        spend += current.spend ?? 0;
        revenue += current.revenue ?? 0;
        purchases += current.purchases ?? 0;
        clicks += current.clicks ?? 0;
        impressions += current.impressions ?? 0;
      }

      return {
        userId: manager.id,
        userName: manager.name,
        metrics: {
          roas: spend > 0 ? revenue / spend : 0,
          cpa: purchases > 0 ? spend / purchases : 0,
          revenue,
          avgTicket: purchases > 0 ? revenue / purchases : 0,
          conversionRate: clicks > 0 ? (purchases / clicks) * 100 : 0,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        },
        medals: {},
        totalPoints: 0,
      };
    })
  );

  rankMetric(entries, "roas", true);
  rankMetric(entries, "cpa", false);
  rankMetric(entries, "revenue", true);
  rankMetric(entries, "avgTicket", true);
  rankMetric(entries, "conversionRate", true);
  rankMetric(entries, "cpm", false);
  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh" }}>
      <RankingBoard
        initialData={{ managers: entries, month, year }}
        initialMonth={month}
        initialYear={year}
      />
    </div>
  );
}
