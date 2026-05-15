import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchAccountInsights } from "@/lib/meta-ads/client";
import { nowBRT, currentPixWeekStart } from "@/lib/date-utils";

export const maxDuration = 60;

interface WeekGoal {
  week: number;
  goal: number;
  traffic?: number;
}

function getWeekNumber(date: Date): number {
  const day = date.getDate();
  return Math.ceil(day / 7) as 1 | 2 | 3 | 4 | 5;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = nowBRT();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const weekStart = currentPixWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const since = weekStart.toISOString().slice(0, 10);
  const until = weekEnd.toISOString().slice(0, 10);
  const currentWeekNum = getWeekNumber(now);

  // Get all active clients with active meta accounts
  const clients = await prisma.client.findMany({
    where: { active: true },
    include: {
      metaAccounts: {
        where: { active: true },
      },
    },
  });

  let updated = 0;
  let errors = 0;

  await Promise.allSettled(
    clients.map(async (client) => {
      if (client.metaAccounts.length === 0) return;

      try {
        // Aggregate traffic across all active meta accounts for this client
        let totalTraffic = 0;

        await Promise.allSettled(
          client.metaAccounts.map(async (account) => {
            try {
              const token = decrypt(account.tokenEncrypted);
              const insights = await fetchAccountInsights({
                accountId: account.accountId,
                token,
                since,
                until,
                campaignFilter: account.campaignFilter,
              });
              totalTraffic += insights.spend;
            } catch {
              // skip failed account
            }
          })
        );

        // Find or create MonthlyGoal for current month
        const existing = await prisma.monthlyGoal.findUnique({
          where: { clientId_year_month: { clientId: client.id, year, month } },
        });

        if (existing) {
          const weeks = (existing.weeks as unknown as WeekGoal[]) ?? [];
          const weekIndex = weeks.findIndex((w) => w.week === currentWeekNum);

          let updatedWeeks: WeekGoal[];
          if (weekIndex >= 0) {
            updatedWeeks = weeks.map((w) =>
              w.week === currentWeekNum ? { ...w, traffic: totalTraffic } : w
            );
          } else {
            updatedWeeks = [...weeks, { week: currentWeekNum, goal: 0, traffic: totalTraffic }];
          }

          await prisma.monthlyGoal.update({
            where: { id: existing.id },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { weeks: updatedWeeks as any },
          });
          updated++;
        } else {
          // Create a new MonthlyGoal with just this week's traffic
          await prisma.monthlyGoal.create({
            data: {
              clientId: client.id,
              year,
              month,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              weeks: [{ week: currentWeekNum, goal: 0, traffic: totalTraffic }] as any,
            },
          });
          updated++;
        }
      } catch {
        errors++;
      }
    })
  );

  return NextResponse.json({
    updated,
    errors,
    period: { since, until },
    weekNum: currentWeekNum,
    updatedAt: new Date().toISOString(),
  });
}
