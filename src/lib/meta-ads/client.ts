// Meta Graph API v21.0
const BASE_URL = "https://graph.facebook.com/v21.0";

export interface MetaInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  purchases: number;
  revenue: number;
  viewContent: number;
  addToCart: number;
  leads: number;
  messages: number;
  frequency: number;
  // Derived (computed, not from API)
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  cpa: number;
  costPerLead: number;
  costPerMessage: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  insights?: MetaInsights;
}

type RawInsights = Omit<MetaInsights, "ctr" | "cpc" | "cpm" | "roas" | "cpa" | "costPerLead" | "costPerMessage">;

function computeDerived(raw: RawInsights): MetaInsights {
  return {
    ...raw,
    ctr: raw.impressions > 0 ? (raw.clicks / raw.impressions) * 100 : 0,
    cpc: raw.clicks > 0 ? raw.spend / raw.clicks : 0,
    cpm: raw.impressions > 0 ? (raw.spend / raw.impressions) * 1000 : 0,
    roas: raw.spend > 0 ? raw.revenue / raw.spend : 0,
    cpa: raw.purchases > 0 ? raw.spend / raw.purchases : 0,
    costPerLead: raw.leads > 0 ? raw.spend / raw.leads : 0,
    costPerMessage: raw.messages > 0 ? raw.spend / raw.messages : 0,
  };
}

function normalizeAccountId(accountId: string): string {
  return accountId.startsWith("act_") ? accountId : `act_${accountId}`;
}

function resolveToken(token: string): string {
  if (!token) {
    const envToken = process.env.META_ACCESS_TOKEN ?? "";
    if (!envToken) throw new Error("No Meta access token available. Set META_ACCESS_TOKEN env var.");
    return envToken;
  }
  return token;
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

function parseInsightsData(data: Record<string, unknown>): RawInsights {
  const actions = data.actions as ActionData[] | undefined;
  const actionValues = data.action_values as ActionData[] | undefined;

  return {
    spend: parseFloat(data.spend as string) || 0,
    impressions: parseFloat(data.impressions as string) || 0,
    reach: parseFloat(data.reach as string) || 0,
    clicks: parseFloat(data.clicks as string) || 0,
    frequency: parseFloat(data.frequency as string) || 0,
    purchases: extractAction(actions, "purchase"),
    revenue: extractAction(actionValues, "purchase"),
    viewContent: extractAction(actions, "view_content"),
    addToCart: extractAction(actions, "add_to_cart"),
    leads: extractAction(actions, "lead"),
    messages: extractAction(actions, "onsite_conversion.messaging_first_reply"),
  };
}

function emptyRaw(): RawInsights {
  return {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    frequency: 0,
    purchases: 0,
    revenue: 0,
    viewContent: 0,
    addToCart: 0,
    leads: 0,
    messages: 0,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAccountInsights(params: {
  accountId: string;
  token: string;
  since: string;
  until: string;
  campaignFilter?: string[];
}): Promise<MetaInsights> {
  const { since, until, campaignFilter = [] } = params;
  const accountId = normalizeAccountId(params.accountId);
  const token = resolveToken(params.token);

  if (campaignFilter.length > 0) {
    const campaigns = await fetchCampaigns({ ...params, accountId, token });
    const filtered = campaigns.filter((c) => c.insights);
    if (filtered.length === 0) {
      return computeDerived(emptyRaw());
    }
    const summed = filtered.reduce<RawInsights>(
      (acc, c) => {
        const ins = c.insights!;
        return {
          spend: acc.spend + ins.spend,
          impressions: acc.impressions + ins.impressions,
          reach: acc.reach + ins.reach,
          clicks: acc.clicks + ins.clicks,
          frequency: acc.frequency, // frequency is averaged differently; keep first
          purchases: acc.purchases + ins.purchases,
          revenue: acc.revenue + ins.revenue,
          viewContent: acc.viewContent + ins.viewContent,
          addToCart: acc.addToCart + ins.addToCart,
          leads: acc.leads + ins.leads,
          messages: acc.messages + ins.messages,
        };
      },
      emptyRaw()
    );
    return computeDerived(summed);
  }

  const fields = "spend,impressions,reach,clicks,frequency,actions,action_values";
  const url = `${BASE_URL}/${accountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&access_token=${token}`;

  const res = await fetchWithTimeout(url);
  const json = await res.json() as { data?: Record<string, unknown>[]; error?: { message: string } };

  if (json.error) {
    throw new Error(`Meta API error: ${json.error.message}`);
  }

  if (!json.data || json.data.length === 0) {
    return computeDerived(emptyRaw());
  }

  return computeDerived(parseInsightsData(json.data[0]));
}

export async function fetchCampaigns(params: {
  accountId: string;
  token: string;
  since: string;
  until: string;
  campaignFilter?: string[];
}): Promise<MetaCampaign[]> {
  const { since, until, campaignFilter = [] } = params;
  const accountId = normalizeAccountId(params.accountId);
  const token = resolveToken(params.token);

  const insightFields = "spend,impressions,reach,clicks,frequency,actions,action_values";
  const url = `${BASE_URL}/${accountId}/campaigns?fields=id,name,status,insights.time_range({"since":"${since}","until":"${until}"}){${insightFields}}&access_token=${token}`;

  const res = await fetchWithTimeout(url);
  const json = await res.json() as {
    data?: Array<{
      id: string;
      name: string;
      status: string;
      insights?: { data: Record<string, unknown>[] };
    }>;
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(`Meta API error: ${json.error.message}`);
  }

  const campaigns: MetaCampaign[] = (json.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    insights:
      c.insights?.data && c.insights.data.length > 0
        ? computeDerived(parseInsightsData(c.insights.data[0]))
        : undefined,
  }));

  if (campaignFilter.length === 0) return campaigns;

  return campaigns.filter((c) =>
    campaignFilter.some((f) => c.name.toLowerCase().includes(f.toLowerCase()))
  );
}
