import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface AuditParams {
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export function logAudit(params: AuditParams): void {
  const data: Prisma.AuditLogUncheckedCreateInput = {
    action: params.action,
    entityType: params.entityType,
    userId: params.userId,
    userEmail: params.userEmail,
    entityId: params.entityId,
    metadata: params.metadata as Prisma.InputJsonValue | undefined,
  };

  prisma.auditLog
    .create({ data })
    .catch((err) => console.error("Audit log failed:", err));
}
