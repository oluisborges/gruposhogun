"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatting";
import { TaskCard } from "./task-card";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskStatus } from "@prisma/client";

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Andamento",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
};

const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-neutral-400",
  IN_PROGRESS: "bg-blue-400",
  DONE: "bg-green-400",
  BLOCKED: "bg-red-400",
};

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];

interface ManagerViewProps {
  tasks: TaskWithRelations[];
  currentUser: UserSummary;
  users: UserSummary[];
  onTaskClick: (task: TaskWithRelations) => void;
}

interface ManagerGroup {
  assigneeId: string | null;
  assigneeName: string;
  tasks: TaskWithRelations[];
}

export function ManagerView({ tasks, currentUser, users, onTaskClick }: ManagerViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["unassigned"]));

  // Group tasks by assignee
  const groups: ManagerGroup[] = [];
  const seenIds = new Set<string | null>();

  // First: assigned tasks grouped by user
  for (const user of users) {
    const userTasks = tasks.filter((t) => t.assigneeId === user.id);
    if (userTasks.length > 0 || true) {
      groups.push({ assigneeId: user.id, assigneeName: user.name, tasks: userTasks });
      seenIds.add(user.id);
    }
  }

  // Add any assignees that are not in the users list (e.g., inactive users)
  for (const task of tasks) {
    if (task.assigneeId && !seenIds.has(task.assigneeId)) {
      const name = task.assignee?.name ?? "Usuário desconhecido";
      groups.push({ assigneeId: task.assigneeId, assigneeName: name, tasks: [task] });
      seenIds.add(task.assigneeId);
    }
  }

  // Unassigned
  const unassigned = tasks.filter((t) => !t.assigneeId);

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {groups
        .filter((g) => g.tasks.length > 0)
        .map((group) => {
          const key = group.assigneeId ?? "unassigned";
          const isOpen = expanded.has(key);
          return (
            <ManagerGroup
              key={key}
              group={group}
              isOpen={isOpen}
              onToggle={() => toggleGroup(key)}
              currentUser={currentUser}
              onTaskClick={onTaskClick}
            />
          );
        })}

      {unassigned.length > 0 && (
        <ManagerGroup
          group={{ assigneeId: null, assigneeName: "Sem responsável", tasks: unassigned }}
          isOpen={expanded.has("unassigned")}
          onToggle={() => toggleGroup("unassigned")}
          currentUser={currentUser}
          onTaskClick={onTaskClick}
        />
      )}

      {tasks.length === 0 && (
        <div className="text-center py-16 text-neutral-600 text-sm">
          Nenhuma tarefa encontrada
        </div>
      )}
    </div>
  );
}

interface ManagerGroupProps {
  group: ManagerGroup;
  isOpen: boolean;
  onToggle: () => void;
  currentUser: UserSummary;
  onTaskClick: (task: TaskWithRelations) => void;
}

function ManagerGroup({ group, isOpen, onToggle, currentUser, onTaskClick }: ManagerGroupProps) {
  const tasksByStatus = STATUSES.reduce<Record<TaskStatus, TaskWithRelations[]>>(
    (acc, s) => ({ ...acc, [s]: group.tasks.filter((t) => t.status === s) }),
    {} as Record<TaskStatus, TaskWithRelations[]>
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800/50 transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        )}
        {group.assigneeId ? (
          <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {initials(group.assigneeName)}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-neutral-700/50 border border-dashed border-neutral-600 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-white">{group.assigneeName}</span>
        <span className="text-xs text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded-full ml-1">
          {group.tasks.length}
        </span>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-neutral-800 px-4 py-3">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {STATUSES.map((status) => {
              const statusTasks = tasksByStatus[status];
              return (
                <div key={status} className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", STATUS_DOT_COLORS[status])} />
                    <span className="text-xs font-medium text-neutral-400">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs text-neutral-600">({statusTasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        currentUser={currentUser}
                        onClick={() => onTaskClick(task)}
                      />
                    ))}
                    {statusTasks.length === 0 && (
                      <div className="h-10 flex items-center justify-center text-xs text-neutral-700 border border-dashed border-neutral-800 rounded-lg">
                        Vazio
                      </div>
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
