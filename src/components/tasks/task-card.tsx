"use client";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskPriority } from "@prisma/client";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

interface TaskCardProps {
  task: TaskWithRelations;
  currentUser: UserSummary;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-neutral-800 border border-neutral-700 rounded-lg p-3 cursor-pointer",
        "hover:bg-neutral-750 hover:border-neutral-600 transition-all",
        "group"
      )}
    >
      {/* Title */}
      <p className="text-sm font-medium text-white line-clamp-2 mb-2 leading-snug">
        {task.title}
      </p>

      {/* Client badge */}
      {task.client && (
        <div className="mb-2">
          <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-neutral-700/60 text-neutral-300 border border-neutral-600/40">
            {task.client.name}
          </span>
        </div>
      )}

      {/* Priority + Labels */}
      <div className="flex flex-wrap gap-1 mb-2">
        <span
          className={cn(
            "inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium",
            PRIORITY_COLORS[task.priority]
          )}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.labels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center text-xs px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: label.color + "33", border: `1px solid ${label.color}55`, color: label.color }}
          >
            {label.name}
          </span>
        ))}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 mt-2">
        {/* Assignee avatar */}
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <div className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {initials(task.assignee.name)}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-neutral-700 border border-dashed border-neutral-500 flex-shrink-0" />
          )}
          {task.assignee && (
            <span className="text-xs text-neutral-500 truncate max-w-[80px]">
              {task.assignee.name.split(" ")[0]}
            </span>
          )}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {isOverdue && (
              <Badge
                variant="destructive"
                className="text-xs px-1 py-0 h-4 leading-none"
              >
                Vencida
              </Badge>
            )}
            <span className={cn("text-xs", isOverdue ? "text-red-400" : "text-neutral-500")}>
              {formatBRTDate(task.dueDate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
