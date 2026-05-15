"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Pencil,
  Phone,
  Mail,
  User,
  BarChart2,
  Users,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { BusinessInfoSection } from "@/components/clients/business-info-section";
import { CustomSections } from "@/components/clients/custom-sections";
import { MetaAccountsSection } from "@/components/clients/meta-accounts-section";
import { ManagersSection } from "@/components/clients/managers-section";
import { AttachmentsSection } from "@/components/clients/attachments-section";
import { ReportsSection } from "@/components/clients/reports-section";
import { ClientTasksSection } from "@/components/clients/client-tasks-section";
import { formatBRTDate } from "@/lib/date-utils";
import { formatBRL } from "@/lib/formatting";
import type { Role, ClientTag, MetaAccount, Report, User as PrismaUser, ClientSection, ClientAttachment, Task, TaskLabel, ClientManager, Prisma } from "@prisma/client";
import type { UserSummary } from "@/types";

const TAG_COLORS: Record<ClientTag, { bg: string; text: string }> = {
  MARMITARIA: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
  DELIVERY: { bg: "rgba(216,90,74,0.1)", text: "#d85a4a" },
  GENERICA: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
};

const TAG_LABELS: Record<ClientTag, string> = {
  MARMITARIA: "Marmitaria",
  DELIVERY: "Delivery",
  GENERICA: "Genérica",
};

interface ClientData {
  id: string;
  name: string;
  tag: ClientTag;
  active: boolean;
  archivedAt: Date | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  usesPix: boolean;
  pixValue: number | null;
  businessInfo: Prisma.JsonValue;
  createdAt: Date;
  managers: (ClientManager & { user: PrismaUser })[];
  metaAccounts: MetaAccount[];
  reports: (Report & { generatedBy: PrismaUser })[];
  customSections: ClientSection[];
  attachments: ClientAttachment[];
  tasks: (Task & { assignee: PrismaUser | null; labels: TaskLabel[] })[];
  _count: { reports: number; tasks: number };
}

interface ClientPageProps {
  client: ClientData;
  userRole: Role;
  userId: string;
  users?: UserSummary[];
}

const NAV_SECTIONS = [
  { id: "overview", label: "Visão Geral" },
  { id: "quick-view", label: "Estatísticas" },
  { id: "business-info", label: "Info do Negócio" },
  { id: "sections", label: "Seções" },
  { id: "meta-accounts", label: "Meta Ads" },
  { id: "managers", label: "Gestores" },
  { id: "attachments", label: "Anexos" },
  { id: "tasks", label: "Tarefas" },
  { id: "reports", label: "Relatórios" },
];

export function ClientPage({ client, userRole, userId, users = [] }: ClientPageProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  async function handleArchive() {
    setArchiving(true);
    await fetch(`/api/clients/${client.id}/archive`, { method: "POST" });
    router.refresh();
    setArchiving(false);
  }

  const businessInfo = (
    client.businessInfo && typeof client.businessInfo === "object" && !Array.isArray(client.businessInfo)
      ? (client.businessInfo as Record<string, string | undefined>)
      : {}
  ) satisfies Record<string, string | undefined>;

  const safeMetaAccounts = client.metaAccounts.map(({ tokenEncrypted: _ignored, ...rest }) => rest);

  return (
    <div style={{ display: "flex", gap: 24, maxWidth: 1280, margin: "0 auto" }}>
      {/* Anchor Nav */}
      <aside style={{
        display: "none",
        flexDirection: "column",
        width: 200,
        flexShrink: 0,
      }}
        className="lg:flex"
      >
        <nav style={{ position: "sticky", top: 0, paddingTop: 4, paddingBottom: 4 }}>
          <Link
            href="/dashboard/clients"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#6e7a70",
              marginBottom: 16,
              textDecoration: "none",
              transition: "color .15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#a8b3aa")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#6e7a70")}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Clientes
          </Link>
          {NAV_SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              style={{
                display: "block",
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                textDecoration: "none",
                marginBottom: 2,
                transition: "all .15s",
                background: activeSection === id ? "rgba(125,193,40,0.1)" : "transparent",
                color: activeSection === id ? "#7DC128" : "#6e7a70",
                fontWeight: activeSection === id ? 600 : 400,
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Overview */}
        <section id="overview" style={{ scrollMarginTop: 16 }}>
          <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h1 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".02em",
                    color: "#e6efe8",
                    margin: 0,
                  }}>
                    {client.name}
                  </h1>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: 20,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    background: TAG_COLORS[client.tag].bg,
                    color: TAG_COLORS[client.tag].text,
                  }}>
                    {TAG_LABELS[client.tag]}
                  </span>
                  {client.active ? (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      background: "rgba(125,193,40,0.1)",
                      color: "#7DC128",
                    }}>Ativo</span>
                  ) : (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      background: "#182219",
                      color: "#6e7a70",
                    }}>Arquivado</span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "#a8b3aa" }}>
                  {client.contactName && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <User style={{ width: 14, height: 14 }} />
                      {client.contactName}
                    </span>
                  )}
                  {client.contactPhone && (
                    <a href={`tel:${client.contactPhone}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "#a8b3aa", textDecoration: "none" }}>
                      <Phone style={{ width: 14, height: 14 }} />
                      {client.contactPhone}
                    </a>
                  )}
                  {client.contactEmail && (
                    <a href={`mailto:${client.contactEmail}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "#a8b3aa", textDecoration: "none" }}>
                      <Mail style={{ width: 14, height: 14 }} />
                      {client.contactEmail}
                    </a>
                  )}
                </div>
              </div>

              {canEdit && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setEditOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "1px solid #1f2a23",
                      color: "#a8b3aa",
                      background: "#0f1813",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    <Pencil style={{ width: 13, height: 13 }} />
                    Editar
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "1px solid #1f2a23",
                      color: "#a8b3aa",
                      background: "#0f1813",
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: archiving ? "not-allowed" : "pointer",
                      opacity: archiving ? 0.5 : 1,
                    }}
                  >
                    {client.active ? (
                      <><Archive style={{ width: 13, height: 13 }} />Arquivar</>
                    ) : (
                      <><ArchiveRestore style={{ width: 13, height: 13 }} />Desarquivar</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick View */}
        <section id="quick-view" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Estatísticas" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            <StatCard icon={<BarChart2 style={{ width: 16, height: 16 }} />} label="Relatórios" value={String(client._count.reports)} />
            <StatCard icon={<Users style={{ width: 16, height: 16 }} />} label="Gestores" value={String(client.managers.length)} />
            <StatCard icon={<CalendarDays style={{ width: 16, height: 16 }} />} label="Cliente desde" value={formatBRTDate(client.createdAt)} />
            {client.usesPix && (
              <StatCard icon={<Wallet style={{ width: 16, height: 16 }} />} label="PIX semanal" value={client.pixValue ? formatBRL(client.pixValue) : "Sim"} />
            )}
          </div>
        </section>

        {/* Business Info */}
        <section id="business-info" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Informações do Negócio" />
          <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}>
            <BusinessInfoSection clientId={client.id} businessInfo={businessInfo} userRole={userRole} />
          </div>
        </section>

        {/* Custom Sections */}
        <section id="sections" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Seções Personalizadas" />
          <CustomSections clientId={client.id} sections={client.customSections} userRole={userRole} />
        </section>

        {/* Meta Accounts */}
        <section id="meta-accounts" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Contas Meta Ads" />
          <MetaAccountsSection clientId={client.id} accounts={safeMetaAccounts} userRole={userRole} />
        </section>

        {/* Managers */}
        <section id="managers" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Gestores" />
          <ManagersSection
            clientId={client.id}
            managers={client.managers.map((m) => ({
              userId: m.userId,
              user: { id: m.user.id, name: m.user.name, email: m.user.email, role: m.user.role },
            }))}
            userRole={userRole}
          />
        </section>

        {/* Attachments */}
        <section id="attachments" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Anexos e Links" />
          <AttachmentsSection clientId={client.id} attachments={client.attachments} userRole={userRole} />
        </section>

        {/* Tasks */}
        <section id="tasks" style={{ scrollMarginTop: 16 }}>
          <SectionHeader title="Tarefas" />
          <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}>
            <ClientTasksSection
              clientId={client.id}
              clientName={client.name}
              currentUser={{
                id: userId,
                name: client.managers.find((m) => m.userId === userId)?.user.name ?? "Usuário",
                email: client.managers.find((m) => m.userId === userId)?.user.email ?? "",
                role: userRole,
                tags: [] as ClientTag[],
                active: true,
              }}
              users={users}
            />
          </div>
        </section>

        {/* Reports */}
        <section id="reports" style={{ scrollMarginTop: 16, paddingBottom: 64 }}>
          <SectionHeader title="Relatórios Recentes" />
          <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 20 }}>
            <ReportsSection clientId={client.id} reports={client.reports} userRole={userRole} metaAccounts={safeMetaAccounts} />
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      {canEdit && (
        <ClientFormModal
          open={editOpen}
          onOpenChange={setEditOpen}
          client={{
            id: client.id,
            name: client.name,
            tag: client.tag,
            contactName: client.contactName,
            contactPhone: client.contactPhone,
            contactEmail: client.contactEmail,
            usesPix: client.usesPix,
            pixValue: client.pixValue,
            managers: client.managers.map((m) => ({ userId: m.userId })),
          }}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#6e7a70", marginBottom: 6 }}>
        Seção
      </p>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".02em",
        color: "#e6efe8",
        margin: 0,
      }}>
        {title}
      </h2>
      <div style={{ marginTop: 8, height: 1, background: "#1f2a23" }} />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: "#141f18", border: "1px solid #1f2a23", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6e7a70", marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>{label}</span>
      </div>
      <p style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#e6efe8",
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </p>
    </div>
  );
}
