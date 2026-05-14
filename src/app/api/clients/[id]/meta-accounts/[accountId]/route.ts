import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { AccountObjective } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; accountId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, accountId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    accountName?: string;
    token?: string;
    campaignFilter?: string[];
    objective?: AccountObjective;
    billingUrl?: string;
    active?: boolean;
  };

  const updateData: Record<string, unknown> = {};

  if (body.accountName !== undefined) updateData.accountName = body.accountName;
  if (body.campaignFilter !== undefined) updateData.campaignFilter = body.campaignFilter;
  if (body.objective !== undefined) updateData.objective = body.objective;
  if (body.billingUrl !== undefined) updateData.billingUrl = body.billingUrl;
  if (body.active !== undefined) updateData.active = body.active;

  if (body.token) {
    try {
      const { encrypt } = await import("@/lib/crypto");
      updateData.tokenEncrypted = encrypt(body.token);
    } catch {
      // skip if encryption not configured
    }
  }

  const account = await prisma.metaAccount.update({
    where: { id: accountId, clientId: id },
    data: updateData,
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE_META_ACCOUNT",
    entityType: "MetaAccount",
    entityId: accountId,
    metadata: { clientId: id, fields: Object.keys(body) },
  });

  const { tokenEncrypted: _, ...safeAccount } = account;
  return NextResponse.json(safeAccount);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, accountId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.metaAccount.delete({
    where: { id: accountId, clientId: id },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "DELETE_META_ACCOUNT",
    entityType: "MetaAccount",
    entityId: accountId,
    metadata: { clientId: id },
  });

  return NextResponse.json({ success: true });
}
