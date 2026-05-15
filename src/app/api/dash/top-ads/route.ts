import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 25;

const BASE_URL = "https://graph.facebook.com/v21.0";

interface AdInsightRaw {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: number;
  purchases: number;
  revenue: number;
  clicks: number;
  thumbnail_url?: string;
}

interface TopAd extends AdInsightRaw {
  cpa: number;
  roas: number;
  purchaseRate: number;
  score: number;
}

interface ActionData {
  action_type: string;
  value: string;
}

function extractAction(actions: ActionData[] | undefined, type: string): number {
  if (!actions) return 0;
  const match = actions.find((a) => a.action_type === type);
  return match ? parseFloat(match.value) || 0 : 0;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const metaAccountId = searchParams.get("metaAccountId");
  const since = searchParams.get("since");
  const until = searchParams.get("until");

  if (!metaAccountId || !since || !until) {
    return NextResponse.json(
      { error: "metaAccountId, since, and until are required" },
      { status: 400 }
    );
  }

  const account = await prisma.metaAccount.findUnique({
    where: { id: metaAccountId },
    include: { client: { select: { id: true } } },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Access control
  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findFirst({
      where: { clientId: account.client.id, userId: user.id },
    });
    if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = decrypt(account.tokenEncrypted);
    const normalizedAccountId = account.accountId.startsWith("act_")
      ? account.accountId
      : `act_${account.accountId}`;

    const insightFields =
      "spend,impressions,clicks,actions,action_values,ad_id,ad_name,campaign_name";
    const url = `${BASE_URL}/${normalizedAccountId}/insights?fields=${insightFields}&level=ad&time_range={"since":"${since}","until":"${until}"}&limit=200&access_token=${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      error?: { message: string };
    };

    if (json.error) {
      throw new Error(`Meta API error: ${json.error.message}`);
    }

    const rawAds: AdInsightRaw[] = (json.data ?? []).map((item) => {
      const actions = item.actions as ActionData[] | undefined;
      const actionValues = item.action_values as ActionData[] | undefined;
      const purchases = extractAction(actions, "purchase");
      const revenue = extractAction(actionValues, "purchase");
      const spend = parseFloat(item.spend as string) || 0;
      const clicks = parseFloat(item.clicks as string) || 0;

      return {
        ad_id: item.ad_id as string,
        ad_name: item.ad_name as string,
        campaign_name: item.campaign_name as string,
        spend,
        purchases,
        revenue,
        clicks,
        thumbnail_url: undefined,
      };
    });

    // Filter: minimum 5 purchases
    const qualifying = rawAds.filter((ad) => ad.purchases >= 5);

    if (qualifying.length === 0) {
      return NextResponse.json({ ads: [] });
    }

    // Compute min CPA and max purchase rate among qualifying ads
    const minCost = Math.min(
      ...qualifying.map((ad) => (ad.purchases > 0 ? ad.spend / ad.purchases : Infinity))
    );
    const maxRate = Math.max(
      ...qualifying.map((ad) => (ad.clicks > 0 ? ad.purchases / ad.clicks : 0))
    );

    // Score and sort
    const topAds: TopAd[] = qualifying
      .map((ad) => {
        const cpa = ad.purchases > 0 ? ad.spend / ad.purchases : 0;
        const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0;
        const purchaseRate = ad.clicks > 0 ? ad.purchases / ad.clicks : 0;

        const score =
          ad.purchases * 0.4 +
          (cpa > 0 && minCost > 0 ? (minCost / cpa) * 0.4 : 0) +
          (purchaseRate > 0 && maxRate > 0 ? (purchaseRate / maxRate) * 0.2 : 0);

        return { ...ad, cpa, roas, purchaseRate, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return NextResponse.json({ ads: topAds });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
