import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { fetchAccountInsights } from "@/lib/meta-ads/client";
import { nowBRT } from "@/lib/date-utils";

interface ZeroSpendAlert {
  clientId: string;
  clientName: string;
  accountId: string;
  accountName: string;
}

interface CacheEntry {
  data: { alerts: ZeroSpendAlert[]; cachedAt: string };
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cacheKey = "zero-spend";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const accounts = await prisma.metaAccount.findMany({
    where: { active: true, client: { active: true } },
    include: { client: { select: { id: true, name: true } } },
  });

  const now = nowBRT();
  const today = now.toISOString().slice(0, 10);

  const alerts: ZeroSpendAlert[] = [];

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

  const result = { alerts, cachedAt: new Date().toISOString() };
  cache.set(cacheKey, { data: result, ts: Date.now() });

  return NextResponse.json(result);
}
