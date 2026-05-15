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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { Role, ClientTag, MetaAccount, Report, User as PrismaUser, ClientSection, ClientAttachment, Task, TaskLabel, ClientManager, Prisma } from "@prisma/client";
import type { UserSummary } from "@/types";

const TAG_COLORS: Record<ClientTag, string> = {
  MARMITARIA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELIVERY: "bg-red-500/10 text-red-400 border-red-500/20",
  GENERICA: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
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

  // Intersection observer for nav highlight
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

  // Safe meta accounts (strip tokenEncrypted from type perspective)
  const safeMetaAccounts = client.metaAccounts.map(({ tokenEncrypted: _ignored, ...rest }) => rest);

  return (
    <div className="flex gap-6 max-w-screen-xl">
      {/* Anchor Nav */}
      <aside className="hidden lg:flex flex-col w-48 flex-shrink-0">
        <nav className="sticky top-0 space-y-0.5 py-1">
          <Link
            href="/dashboard/clients"
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Clientes
          </Link>
          {NAV_SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={cn(
                "block px-3 py-1.5 rounded-md text-xs transition-colors",
                activeSection === id
                  ? "bg-red-500/10 text-red-400 font-medium"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
              )}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Overview */}
        <section id="overview" className="scroll-mt-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                      TAG_COLORS[client.tag]
                    )}
                  >
                    {TAG_LABELS[client.tag]}
                  </span>
                  {client.active ? (
                    <Badge variant="success">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Arquivado</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                  {client.contactName && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {client.contactName}
                    </span>
                  )}
                  {client.contactPhone && (
                    <a
                      href={`tel:${client.contactPhone}`}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {client.contactPhone}
                    </a>
                  )}
                  {client.contactEmail && (
                    <a
                      href={`mailto:${client.contactEmail}`}
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {client.contactEmail}
                    </a>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditOpen(true)}
                    className="text-neutral-400 hover:text-white border border-neutral-700"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleArchive}
                    disabled={archiving}
                    className="text-neutral-400 hover:text-yellow-400 border border-neutral-700"
                  >
                    {client.active ? (
                      <><Archive className="w-3.5 h-3.5 mr-1.5" />Arquivar</>
                    ) : (
                      <><ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />Desarquivar</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Quick View */}
        <section id="quick-view" className="scroll-mt-4">
          <SectionHeader title="Estatísticas" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<BarChart2 className="w-4 h-4" />}
              label="Relatórios"
              value={String(client._count.reports)}
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Gestores"
              value={String(client.managers.length)}
            />
            <StatCard
              icon={<CalendarDays className="w-4 h-4" />}
              label="Cliente desde"
              value={formatBRTDate(client.createdAt)}
            />
            {client.usesPix && (
              <StatCard
                icon={<Wallet className="w-4 h-4" />}
                label="PIX semanal"
                value={client.pixValue ? formatBRL(client.pixValue) : "Sim"}
              />
            )}
          </div>
        </section>

        {/* Business Info */}
        <section id="business-info" className="scroll-mt-4">
          <SectionHeader title="Informações do Negócio" />
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <BusinessInfoSection
              clientId={client.id}
              businessInfo={businessInfo}
              userRole={userRole}
            />
          </div>
        </section>

        {/* Custom Sections */}
        <section id="sections" className="scroll-mt-4">
          <SectionHeader title="Seções Personalizadas" />
          <CustomSections
            clientId={client.id}
            sections={client.customSections}
            userRole={userRole}
          />
        </section>

        {/* Meta Accounts */}
        <section id="meta-accounts" className="scroll-mt-4">
          <SectionHeader title="Contas Meta Ads" />
          <MetaAccountsSection
            clientId={client.id}
            accounts={safeMetaAccounts}
            userRole={userRole}
          />
        </section>

        {/* Managers */}
        <section id="managers" className="scroll-mt-4">
          <SectionHeader title="Gestores" />
          <ManagersSection
            clientId={client.id}
            managers={client.managers.map((m) => ({
              userId: m.userId,
              user: {
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                role: m.user.role,
              },
            }))}
            userRole={userRole}
          />
        </section>

        {/* Attachments */}
        <section id="attachments" className="scroll-mt-4">
          <SectionHeader title="Anexos e Links" />
          <AttachmentsSection
            clientId={client.id}
            attachments={client.attachments}
            userRole={userRole}
          />
        </section>

        {/* Tasks */}
        <section id="tasks" className="scroll-mt-4">
          <SectionHeader title="Tarefas" />
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
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
        <section id="reports" className="scroll-mt-4 pb-16">
          <SectionHeader title="Relatórios Recentes" />
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <ReportsSection
              clientId={client.id}
              reports={client.reports}
              userRole={userRole}
              metaAccounts={safeMetaAccounts}
            />
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
    <div className="mb-3">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-1 h-px bg-neutral-800" />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-neutral-500 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
