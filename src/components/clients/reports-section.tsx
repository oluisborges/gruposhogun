"use client";

import { useState } from "react";
import { Copy, Trash2, Check } from "lucide-react";
import { GenerateReportModal } from "@/components/reports/generate-report-modal";
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

const REPORT_TYPE_COLORS: Record<ReportType, { bg: string; text: string }> = {
  WEEKLY: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
  MONTHLY: { bg: "rgba(155,224,58,0.1)", text: "#9be03a" },
  CUSTOM: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "#6e7a70" }}>{reports.length} relatório(s) recentes</p>
        <GenerateReportModal
          clientId={clientId}
          accounts={metaAccounts}
          onGenerated={(report) => {
            setReports((prev) => [{ ...report, generatedBy: { name: "Você" } as User }, ...prev]);
          }}
        />
      </div>

      {reports.length === 0 ? (
        <p style={{ fontSize: 13, color: "#4a5450", fontStyle: "italic" }}>Nenhum relatório gerado ainda</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2a23" }}>
                {["Tipo", "Período", "Gerador", "Criado em", "Ações"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: i === 4 ? "right" : "left",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      color: "#6e7a70",
                      fontWeight: 700,
                      paddingBottom: 10,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => (
                <tr
                  key={report.id}
                  style={{ borderBottom: idx < reports.length - 1 ? "1px dashed #1f2a23" : "none" }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: 20,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      background: REPORT_TYPE_COLORS[report.type].bg,
                      color: REPORT_TYPE_COLORS[report.type].text,
                    }}>
                      {REPORT_TYPE_LABELS[report.type]}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#a8b3aa", fontSize: 13, whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                    {formatBRTDate(report.periodStart)} — {formatBRTDate(report.periodEnd)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#a8b3aa", fontSize: 13 }}>
                    {report.generatedBy.name}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#6e7a70", fontSize: 13, whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                    {formatBRTDate(report.createdAt)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      <button
                        onClick={() => handleCopy(report)}
                        title="Copiar conteúdo"
                        style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", color: copiedId === report.id ? "#7DC128" : "#4a5450", cursor: "pointer" }}
                        onMouseOver={(e) => { if (copiedId !== report.id) e.currentTarget.style.color = "#a8b3aa"; }}
                        onMouseOut={(e) => { if (copiedId !== report.id) e.currentTarget.style.color = "#4a5450"; }}
                      >
                        {copiedId === report.id ? (
                          <Check style={{ width: 13, height: 13 }} />
                        ) : (
                          <Copy style={{ width: 13, height: 13 }} />
                        )}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingId === report.id}
                          title="Remover"
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            background: "transparent",
                            border: "none",
                            color: "#4a5450",
                            cursor: deletingId === report.id ? "not-allowed" : "pointer",
                            opacity: deletingId === report.id ? 0.5 : 1,
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                          onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
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
