import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { fetchCampaigns } from "@/lib/meta-ads/client"

export const maxDuration = 25

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const metaAccountId = searchParams.get("metaAccountId")
  const since = searchParams.get("since")
  const until = searchParams.get("until")

  if (!metaAccountId || !since || !until) {
    return NextResponse.json({ error: "metaAccountId, since, and until are required" }, { status: 400 })
  }

  const account = await prisma.metaAccount.findUnique({
    where: { id: metaAccountId },
    include: { client: { select: { id: true } } },
  })

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  // Check access: privileged roles can see all, managers only managed clients
  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findFirst({
      where: { clientId: account.client.id, userId: user.id },
    })
    if (!managed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const token = decrypt(account.tokenEncrypted)
    const campaigns = await fetchCampaigns({
      accountId: account.accountId,
      token,
      since,
      until,
    })

    return NextResponse.json({ campaigns })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
