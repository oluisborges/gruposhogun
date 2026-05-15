"use client";

import { useState } from "react";
import { Copy, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GenerateReportModal } from "@/components/reports/generate-report-modal";
// Button imported transitively via GenerateReportModal
import { formatBRTDate } from "@/lib/date-utils";
import type { Report, User, ReportType, Role, MetaAccount } from "@prisma/client";

type ReportWithUser = Report & { generatedBy: User };

interface ReportsSectionProps {
  clientId: string;
  reports: ReportWithUser[];
  userRole: Role;
  metaAccounts?: Omit<MetaAccount, "tokenEncrypted">[];
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  CUSTOM: "Personalizado",
};

const REPORT_TYPE_VARIANTS: Record<ReportType, "default" | "secondary" | "warning"> = {
  WEEKLY: "default",
  MONTHLY: "warning",
  CUSTOM: "secondary",
};

export function ReportsSection({ clientId, reports: initialReports, userRole, metaAccounts = [] }: ReportsSectionProps) {
  const [reports, setReports] = useState<ReportWithUser[]>(initialReports);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  async function handleCopy(report: ReportWithUser) {
    await navigator.clipboard.writeText(report.content);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(reportId: string) {
    if (!confirm("Remover este relatório?")) return;
    setDeletingId(reportId);
    const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{reports.length} relatório(s) recentes</p>
        <GenerateReportModal
          clientId={clientId}
          accounts={metaAccounts}
          onGenerated={(report) => {
            // Add to list (cast to include generatedBy placeholder)
            setReports((prev) => [{ ...report, generatedBy: { name: "Você" } as User }, ...prev]);
          }}
        />
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-neutral-500 italic">Nenhum relatório gerado ainda</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left py-2 text-xs text-neutral-500 font-medium">Tipo</th>
                <th className="text-left py-2 text-xs text-neutral-500 font-medium">Período</th>
                <th className="text-left py-2 text-xs text-neutral-500 font-medium">Gerador</th>
                <th className="text-left py-2 text-xs text-neutral-500 font-medium">Criado em</th>
                <th className="text-right py-2 text-xs text-neutral-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors">
                  <td className="py-2.5 pr-4">
                    <Badge variant={REPORT_TYPE_VARIANTS[report.type]}>
                      {REPORT_TYPE_LABELS[report.type]}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-400 whitespace-nowrap">
                    {formatBRTDate(report.periodStart)} — {formatBRTDate(report.periodEnd)}
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-400">
                    {report.generatedBy.name}
                  </td>
                  <td className="py-2.5 pr-4 text-neutral-500 whitespace-nowrap">
                    {formatBRTDate(report.createdAt)}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleCopy(report)}
                        className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
                        title="Copiar conteúdo"
                      >
                        {copiedId === report.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingId === report.id}
                          className="p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
