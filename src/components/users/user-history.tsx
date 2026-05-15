"use client";

import { useRouter } from "next/navigation";
import { formatBRTDateTime } from "@/lib/date-utils";
import { ArrowLeft } from "lucide-react";
import type { AuditLog } from "@prisma/client";

interface UserHistoryProps {
  logs: AuditLog[];
  userName: string;
}

const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CREATE: { bg: "rgba(125,193,40,0.1)", text: "#7DC128", dot: "#7DC128" },
  UPDATE: { bg: "rgba(125,193,40,0.08)", text: "#9be03a", dot: "#9be03a" },
  PATCH: { bg: "rgba(125,193,40,0.08)", text: "#9be03a", dot: "#9be03a" },
  DELETE: { bg: "rgba(216,90,74,0.1)", text: "#d85a4a", dot: "#d85a4a" },
  ARCHIVE: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a", dot: "#e8a73a" },
  RESTORE: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a", dot: "#e8a73a" },
};

function getActionStyle(action: string) {
  const key = action.toUpperCase();
  return ACTION_COLORS[key] ?? { bg: "#182219", text: "#6e7a70", dot: "#6e7a70" };
}

export function UserHistory({ logs, userName }: UserHistoryProps) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f1813",
            border: "1px solid #1f2a23",
            borderRadius: 8,
            color: "#a8b3aa",
            cursor: "pointer",
          }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
        </button>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#6e7a70", marginBottom: 2 }}>
            Histórico
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".02em",
            color: "#e6efe8",
            margin: 0,
          }}>
            {userName}
          </h1>
          <p style={{ fontSize: 12, color: "#6e7a70", marginTop: 2 }}>
            {logs.length} {logs.length === 1 ? "registro" : "registros"} encontrados
          </p>
        </div>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#4a5450", fontSize: 13 }}>
          Nenhum registro de auditoria encontrado para este usuário.
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 15, top: 16, bottom: 16, width: 1, background: "#1f2a23" }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            {logs.map((log, index) => {
              const s = getActionStyle(log.action);
              return (
                <div key={log.id} style={{ position: "relative", display: "flex", gap: 16, paddingBottom: index < logs.length - 1 ? 24 : 0 }}>
                  {/* Dot */}
                  <div style={{
                    position: "relative",
                    zIndex: 1,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: s.bg,
                    border: `1px solid ${s.dot}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: s.text,
                  }}>
                    {log.action.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    background: "#141f18",
                    border: "1px solid #1f2a23",
                    borderRadius: 10,
                    padding: 16,
                    minWidth: 0,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: 20,
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          background: s.bg,
                          color: s.text,
                        }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e6efe8" }}>
                          {log.entityType}
                        </span>
                        {log.entityId && (
                          <span style={{ fontSize: 11, color: "#4a5450", fontFamily: "var(--font-mono)" }}>
                            {log.entityId.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "#6e7a70", flexShrink: 0, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                        {formatBRTDateTime(log.createdAt)}
                      </span>
                    </div>

                    {log.userEmail && (
                      <p style={{ fontSize: 12, color: "#6e7a70", marginBottom: 8 }}>
                        por <span style={{ color: "#a8b3aa" }}>{log.userEmail}</span>
                      </p>
                    )}

                    {log.metadata && (
                      <pre style={{
                        fontSize: 11,
                        color: "#6e7a70",
                        background: "#0f1813",
                        border: "1px solid #1f2a23",
                        borderRadius: 6,
                        padding: "8px 12px",
                        overflowX: "auto",
                        margin: 0,
                        fontFamily: "var(--font-mono)",
                      }}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
