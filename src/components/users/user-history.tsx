"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatBRTDateTime } from "@/lib/date-utils";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@prisma/client";

interface UserHistoryProps {
  logs: AuditLog[];
  userName: string;
}

function getActionColor(action: string): string {
  const upper = action.toUpperCase();
  if (upper === "CREATE") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (upper === "UPDATE" || upper === "PATCH") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (upper === "DELETE") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (upper === "ARCHIVE" || upper === "RESTORE") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-neutral-700 text-neutral-300 border-neutral-600";
}

function getActionDotColor(action: string): string {
  const upper = action.toUpperCase();
  if (upper === "CREATE") return "bg-green-500";
  if (upper === "UPDATE" || upper === "PATCH") return "bg-blue-500";
  if (upper === "DELETE") return "bg-red-500";
  if (upper === "ARCHIVE" || upper === "RESTORE") return "bg-orange-500";
  return "bg-neutral-500";
}

export function UserHistory({ logs, userName }: UserHistoryProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-neutral-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Histórico de {userName}</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {logs.length} {logs.length === 1 ? "registro" : "registros"} encontrados
          </p>
        </div>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          Nenhum registro de auditoria encontrado para este usuário.
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-neutral-800" />

          {logs.map((log, index) => (
            <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white",
                  getActionDotColor(log.action)
                )}
              >
                {log.action.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="flex-1 bg-neutral-900 rounded-lg border border-neutral-800 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                        getActionColor(log.action)
                      )}
                    >
                      {log.action}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {log.entityType}
                    </span>
                    {log.entityId && (
                      <span className="text-xs text-neutral-500 font-mono">
                        {log.entityId.slice(0, 12)}...
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 flex-shrink-0">
                    {formatBRTDateTime(log.createdAt)}
                  </span>
                </div>

                {log.userEmail && (
                  <p className="text-xs text-neutral-400 mt-1">
                    por <span className="text-neutral-300">{log.userEmail}</span>
                  </p>
                )}

                {log.metadata && (
                  <div className="mt-2">
                    <pre className="text-xs text-neutral-500 bg-neutral-950 rounded p-2 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
