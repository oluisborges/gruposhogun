import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { AccountObjective } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.metaAccount.findMany({
    where: { clientId: id },
    orderBy: { accountName: "asc" },
  });

  // Strip encrypted token from response
  return NextResponse.json(
    accounts.map(({ tokenEncrypted: _, ...acc }) => acc)
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    accountId: string;
    accountName?: string;
    token?: string;
    campaignFilter?: string[];
    objective?: AccountObjective;
    billingUrl?: string;
  };

  if (!body.accountId?.trim()) {
    return NextResponse.json({ error: "Account ID é obrigatório" }, { status: 400 });
  }

  let tokenEncrypted = "";
  if (body.token) {
    try {
      const { encrypt } = await import("@/lib/crypto");
      tokenEncrypted = encrypt(body.token);
    } catch {
      // If encryption not configured, store empty
      tokenEncrypted = "";
    }
  }

  const account = await prisma.metaAccount.create({
    data: {
      clientId: id,
      accountId: body.accountId.trim(),
      accountName: body.accountName,
      tokenEncrypted,
      campaignFilter: body.campaignFilter ?? [],
      objective: body.objective ?? "CARDAPIO",
      billingUrl: body.billingUrl,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "CREATE_META_ACCOUNT",
    entityType: "MetaAccount",
    entityId: account.id,
    metadata: { clientId: id, accountId: account.accountId },
  });

  const { tokenEncrypted: _, ...safeAccount } = account;
  return NextResponse.json(safeAccount, { status: 201 });
}
