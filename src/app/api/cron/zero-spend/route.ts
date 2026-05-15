import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchAccountInsights } from "@/lib/meta-ads/client";
import { nowBRT } from "@/lib/date-utils";

export const maxDuration = 60;

interface ZeroSpendAlert {
  clientId: string;
  clientName: string;
  accountId: string;
  accountName: string;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.metaAccount.findMany({
    where: { active: true, client: { active: true } },
    include: { client: { select: { id: true, name: true } } },
  });

  const now = nowBRT();
  const today = now.toISOString().slice(0, 10);

  const alerts: ZeroSpendAlert[] = [];
  let checked = 0;

  await Promise.allSettled(
    accounts.map(async (account) => {
      try {
        const token = decrypt(account.tokenEncrypted);
        const insights = await fetchAccountInsights({
          accountId: account.accountId,
          token,
          since: today,
          until: today,
          campaignFilter: account.campaignFilter,
        });
        checked++;
        if (insights.spend === 0) {
          alerts.push({
            clientId: account.client.id,
            clientName: account.client.name,
            accountId: account.accountId,
            accountName: account.accountName ?? account.accountId,
          });
        }
      } catch {
        // silently skip failed accounts
      }
    })
  );

  return NextResponse.json({
    checked,
    alerts: alerts.length,
    alertDetails: alerts,
    checkedAt: new Date().toISOString(),
  });
}
