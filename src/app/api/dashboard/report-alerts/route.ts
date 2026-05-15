import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { nowBRT } from "@/lib/date-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = nowBRT();

  // Weekly cycle: Sunday 20h BRT → Saturday 23:59 BRT
  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToSunday = dayOfWeek; // days since last Sunday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diffToSunday);
  weekStart.setHours(20, 0, 0, 0);

  // If before Sunday 20h, go back one more week
  if (now < weekStart) {
    weekStart.setDate(weekStart.getDate() - 7);
  }
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Monthly cycle: day 1 → last day
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Determine which clients to check
  let clientFilter: { id: { in: string[] } } | undefined;
  if (user.role === "MANAGER") {
    const managed = await prisma.clientManager.findMany({
      where: { userId: user.id },
      select: { clientId: true },
    });
    clientFilter = { id: { in: managed.map((m) => m.clientId) } };
  }

  const clients = await prisma.client.findMany({
    where: {
      active: true,
      ...clientFilter,
    },
    select: {
      id: true,
      name: true,
      reports: {
        where: {
          createdAt: {
            gte: weekStart,
          },
        },
        select: { id: true, createdAt: true },
      },
    },
  });

  // Fetch monthly reports separately
  const clientIds = clients.map((c) => c.id);
  const monthlyReports = await prisma.report.findMany({
    where: {
      clientId: { in: clientIds },
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    select: { clientId: true },
  });
  const hasMonthly = new Set(monthlyReports.map((r) => r.clientId));

  const alerts = clients.map((client) => {
    const weeklyReports = client.reports.filter(
      (r) => r.createdAt >= weekStart && r.createdAt <= weekEnd
    );
    const missingWeekly = weeklyReports.length === 0;
    const missingMonthly = !hasMonthly.has(client.id);

    return {
      clientId: client.id,
      clientName: client.name,
      missingWeekly,
      missingMonthly,
    };
  }).filter((a) => a.missingWeekly || a.missingMonthly);

  return NextResponse.json(alerts);
}
