import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { fetchAccountInsights } from "@/lib/meta-ads/client";
import { inferReportType, formatReport } from "@/lib/reports/generator";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    clientId: string;
    metaAccountId: string;
    since: string;
    until: string;
  };

  const { clientId, metaAccountId, since, until } = body;

  if (!clientId || !metaAccountId || !since || !until) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // MANAGER must manage the client
  if (user.role === "MANAGER") {
    const manages = await prisma.clientManager.findFirst({
      where: { clientId, userId: user.id },
    });
    if (!manages) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch MetaAccount and verify it belongs to clientId
  const account = await prisma.metaAccount.findFirst({
    where: { id: metaAccountId, clientId },
    include: { client: { select: { name: true } } },
  });

  if (!account) {
    return NextResponse.json({ error: "Meta account not found" }, { status: 404 });
  }

  // Decrypt token
  let token = "";
  if (account.tokenEncrypted) {
    try {
      token = decrypt(account.tokenEncrypted);
    } catch {
      // If decrypt fails (e.g., key not set), pass empty string to use env fallback
      token = "";
    }
  }

  // Infer report type
  const periodStart = new Date(since);
  const periodEnd = new Date(until);
  const reportType = inferReportType(periodStart, periodEnd);

  // Calculate previous period (same duration, immediately before since)
  const durationMs = periodEnd.getTime() - periodStart.getTime();
  const prevEnd = new Date(periodStart.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  const prevSince = prevStart.toISOString().split("T")[0];
  const prevUntil = prevEnd.toISOString().split("T")[0];

  // Fetch current and previous period insights
  try {
    const [current, previous] = await Promise.all([
      fetchAccountInsights({
        accountId: account.accountId,
        token,
        since,
        until,
        campaignFilter: account.campaignFilter,
      }),
      fetchAccountInsights({
        accountId: account.accountId,
        token,
        since: prevSince,
        until: prevUntil,
        campaignFilter: account.campaignFilter,
      }),
    ]);

    // Format report text
    const content = formatReport({
      clientName: account.client.name,
      accountName: account.accountName ?? account.accountId,
      objective: account.objective,
      period: { start: periodStart, end: periodEnd },
      current,
      previous,
    });

    // Save report to DB
    const rawData = {
      current,
      previous,
      period: { since, until },
      previousPeriod: { since: prevSince, until: prevUntil },
    };

    const report = await prisma.report.create({
      data: {
        clientId,
        metaAccountId,
        type: reportType,
        periodStart,
        periodEnd,
        content,
        rawData,
        generatedById: user.id,
      },
      include: {
        client: { select: { name: true } },
        metaAccount: { select: { accountName: true } },
        generatedBy: { select: { name: true } },
      },
    });

    logAudit({
      userId: user.id,
      userEmail: user.email,
      action: "CREATE",
      entityType: "Report",
      entityId: report.id,
      metadata: { clientId, metaAccountId, type: reportType, since, until },
    });

    return NextResponse.json({ report, current, previous });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
