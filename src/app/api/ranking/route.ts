import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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
    const medal = medals[idx];
    const found = entries.find((e) => e.userId === entry.userId);
    if (found) {
      found.medals[key] = medal;
      found.totalPoints += MEDAL_POINTS[medal];
    }
  });
}

interface RawData {
  current?: Partial<MetaInsights>;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

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

      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;
      const avgTicket = purchases > 0 ? revenue / purchases : 0;
      const conversionRate = clicks > 0 ? (purchases / clicks) * 100 : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

      return {
        userId: manager.id,
        userName: manager.name,
        metrics: { roas, cpa, revenue, avgTicket, conversionRate, cpm },
        medals: {},
        totalPoints: 0,
      };
    })
  );

  // Rank each metric (higher is better except CPA and CPM)
  rankMetric(entries, "roas", true);
  rankMetric(entries, "cpa", false);
  rankMetric(entries, "revenue", true);
  rankMetric(entries, "avgTicket", true);
  rankMetric(entries, "conversionRate", true);
  rankMetric(entries, "cpm", false);

  entries.sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json({ managers: entries, month, year });
}
