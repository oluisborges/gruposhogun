"use client";

import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
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

interface TaskColumnProps {
  status: TaskStatus;
  tasks: TaskWithRelations[];
  currentUser: UserSummary;
  onTaskClick: (task: TaskWithRelations) => void;
  onNewTask: (status: TaskStatus) => void;
}

export function TaskColumn({ status, tasks, currentUser, onTaskClick, onNewTask }: TaskColumnProps) {
  return (
    <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl min-w-[280px] flex-1 max-h-[calc(100vh-200px)]">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", STATUS_DOT_COLORS[status])} />
          <span className="text-sm font-medium text-white">{STATUS_LABELS[status]}</span>
        </div>
        <span className="text-xs text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentUser={currentUser}
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-neutral-600 text-xs">
            Nenhuma tarefa
          </div>
        )}
      </div>

      {/* Add task button */}
      <div className="p-2 border-t border-neutral-800 flex-shrink-0">
        <button
          onClick={() => onNewTask(status)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Tarefa
        </button>
      </div>
    </div>
  );
}
