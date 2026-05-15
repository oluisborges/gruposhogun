import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DataHub } from "@/components/dash/data-hub";
import { Database } from "lucide-react";
import type { Role } from "@prisma/client";

export default async function DashPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireAuth();
  const userId = session.user?.id as string;
  const userRole = session.user?.role as Role;

  const { clientId } = await searchParams;

  // Build client filter based on role
  const isPrivileged = userRole === "OWNER" || userRole === "COORDINATOR";

  if (!clientId) {
    // Show client selector
    let clients;
    if (isPrivileged) {
      clients = await prisma.client.findMany({
        where: { active: true },
        include: {
          metaAccounts: {
            where: { active: true },
            select: { id: true, accountName: true, accountId: true },
          },
        },
        orderBy: { name: "asc" },
      });
    } else {
      const managed = await prisma.clientManager.findMany({
        where: { userId },
        select: { clientId: true },
      });
      const ids = managed.map((m) => m.clientId);
      clients = await prisma.client.findMany({
        where: { active: true, id: { in: ids } },
        include: {
          metaAccounts: {
            where: { active: true },
            select: { id: true, accountName: true, accountId: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    return (
      <div className="flex flex-col" style={{ minHeight: "100vh", background: "#0d1410" }}>
        {/* Topbar */}
        <div
          className="flex-shrink-0 flex items-center gap-5 px-7 sticky top-0 z-10"
          style={{
            height: 64,
            borderBottom: "1px solid #1f2a23",
            background: "rgba(13,20,16,0.85)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-2 text-sm">
            <span style={{ color: "#6e7a70" }}>Ferramentas</span>
            <span style={{ color: "#4a5450" }}>/</span>
            <span style={{ color: "#e6efe8", fontWeight: 600 }}>HUB de Dados</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Database style={{ width: 16, height: 16, color: "#7DC128" }} />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "28px 28px", flex: 1 }}>
          <p style={{ fontSize: 13, color: "#6e7a70", marginBottom: 24 }}>
            Selecione um cliente para visualizar os dados
          </p>

          {clients.length === 0 ? (
            <div
              style={{
                background: "#141f18",
                border: "1px solid #1f2a23",
                borderRadius: 10,
                padding: 32,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 14, color: "#4a5450" }}>Nenhum cliente disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/dash?clientId=${client.id}`}
                  style={{
                    background: "#141f18",
                    border: "1px solid #1f2a23",
                    borderRadius: 10,
                    padding: 20,
                    textDecoration: "none",
                    display: "block",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#28342a")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1f2a23")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #244a32, #15301f)",
                        border: "1px solid #284d36",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: "#9be03a", fontWeight: 700, fontSize: 14 }}>
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#6e7a70",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {client.metaAccounts.length} conta{client.metaAccounts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e6efe8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client.name}
                  </h3>
                  {client.metaAccounts.length > 0 && (
                    <p style={{ fontSize: 11, color: "#6e7a70", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {client.metaAccounts[0].accountName ?? client.metaAccounts[0].accountId}
                      {client.metaAccounts.length > 1 && ` +${client.metaAccounts.length - 1}`}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Load client with accounts
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      metaAccounts: {
        where: { active: true },
        select: { id: true, accountName: true, accountId: true },
      },
    },
  });

  if (!client) {
    redirect("/dashboard/dash");
  }

  // Access check for managers
  if (!isPrivileged) {
    const managed = await prisma.clientManager.findFirst({
      where: { clientId, userId },
    });
    if (!managed) redirect("/dashboard/dash");
  }

  // Load recent reports for charts (last 8)
  const recentReports = await prisma.report.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      rawData: true,
      createdAt: true,
    },
  });

  const currentUser = {
    id: userId,
    role: userRole,
  };

  const clientData = {
    id: client.id,
    name: client.name,
    tag: client.tag,
    metaAccounts: client.metaAccounts,
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh" }}>
      <DataHub
        client={clientData}
        currentUser={currentUser}
        recentReports={recentReports.map((r) => ({
          id: r.id,
          periodStart: r.periodStart.toISOString(),
          periodEnd: r.periodEnd.toISOString(),
          rawData: r.rawData,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
