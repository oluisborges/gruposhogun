import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import type { ClientTag, AccountObjective } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const tag = searchParams.get("tag") as ClientTag | null;
  const managerId = searchParams.get("managerId") ?? undefined;
  const archived = searchParams.get("archived") === "true";

  const isManager = user.role === "MANAGER";

  const clients = await prisma.client.findMany({
    where: {
      ...(isManager
        ? { managers: { some: { userId: user.id } } }
        : {}),
      active: !archived,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(tag ? { tag } : {}),
      ...(managerId ? { managers: { some: { userId: managerId } } } : {}),
    },
    include: {
      managers: { include: { user: true } },
      metaAccounts: true,
      _count: { select: { reports: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as {
    name: string;
    tag?: ClientTag;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    usesPix?: boolean;
    pixValue?: number;
    managerIds?: string[];
    metaAccount?: {
      accountId: string;
      accountName?: string;
      token: string;
      objective?: AccountObjective;
      campaignFilter?: string[];
    };
  };

  const { name, tag, contactName, contactPhone, contactEmail, usesPix, pixValue, managerIds, metaAccount } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (metaAccount && (!metaAccount.accountId || !metaAccount.token)) {
    return NextResponse.json({ error: "ID da conta e token são obrigatórios para vincular Meta Ads" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name: name.trim(),
      tag: tag ?? "GENERICA",
      contactName,
      contactPhone,
      contactEmail,
      usesPix: usesPix ?? false,
      pixValue,
      managers: {
        create: (managerIds ?? []).map((userId) => ({ userId })),
      },
      ...(metaAccount
        ? {
            metaAccounts: {
              create: {
                accountId: metaAccount.accountId.trim(),
                accountName: metaAccount.accountName?.trim() || null,
                tokenEncrypted: encrypt(metaAccount.token.trim()),
                objective: metaAccount.objective ?? "CARDAPIO",
                campaignFilter: metaAccount.campaignFilter ?? [],
              },
            },
          }
        : {}),
    },
    include: {
      managers: { include: { user: true } },
      metaAccounts: true,
      _count: { select: { reports: true } },
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    metadata: { name: client.name },
  });

  return NextResponse.json(client, { status: 201 });
}
