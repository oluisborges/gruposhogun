"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { TaskColumn } from "./task-column";
import { TaskModal } from "./task-modal";
import { TaskDetailPanel } from "./task-detail-panel";
import { ManagerView } from "./manager-view";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskStatus, TaskPriority } from "@prisma/client";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];

interface TasksBoardProps {
  tasks: TaskWithRelations[];
  currentUser: UserSummary;
  clients: { id: string; name: string }[];
  users: UserSummary[];
}

export function TasksBoard({ tasks: initialTasks, currentUser, clients, users }: TasksBoardProps) {
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [filterAssigneeId, setFilterAssigneeId] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [viewMode, setViewMode] = useState<"all" | "byManager">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>("TODO");
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);

  const isPrivileged = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const handleRefresh = useCallback(() => {
    router.refresh();
    // Re-fetch tasks from API to update local state
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data: TaskWithRelations[]) => setTasks(data))
      .catch(() => router.refresh());
  }, [router]);

  const handleTaskUpdated = useCallback((updatedTask: TaskWithRelations) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);
  }, []);

  const handleTaskCreated = useCallback(() => {
    setModalOpen(false);
    handleRefresh();
  }, [handleRefresh]);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
    router.refresh();
  }, [router]);

  const handleNewTask = useCallback((status: TaskStatus) => {
    setModalDefaultStatus(status);
    setModalOpen(true);
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAssigneeId && t.assigneeId !== filterAssigneeId) return false;
    if (filterClientId && t.clientId !== filterClientId) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Tarefas</h1>
        <button
          onClick={() => {
            setModalDefaultStatus("TODO");
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 w-48"
          />
        </div>

        {isPrivileged && (
          <>
            <select
              value={filterAssigneeId}
              onChange={(e) => setFilterAssigneeId(e.target.value)}
              className="h-8 text-sm bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            >
              <option value="">Todos os responsáveis</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="h-8 text-sm bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-neutral-600"
            >
              <option value="">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "")}
          className="h-8 text-sm bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        >
          <option value="">Todas as prioridades</option>
          <option value="URGENT">Urgente</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Média</option>
          <option value="LOW">Baixa</option>
        </select>

        {isPrivileged && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode("all")}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
                viewMode === "all"
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              Geral
            </button>
            <button
              onClick={() => setViewMode("byManager")}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
                viewMode === "byManager"
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              Por Gestor
            </button>
          </div>
        )}
      </div>

      {/* Board area */}
      {isPrivileged && viewMode === "byManager" ? (
        <div className="flex-1 overflow-y-auto min-h-0">
          <ManagerView
            tasks={filteredTasks}
            currentUser={currentUser}
            users={users}
            onTaskClick={setSelectedTask}
          />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {STATUSES.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={filteredTasks.filter((t) => t.status === status)}
              currentUser={currentUser}
              onTaskClick={setSelectedTask}
              onNewTask={handleNewTask}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStatus={modalDefaultStatus}
        currentUser={currentUser}
        clients={clients}
        users={users}
        onSaved={handleTaskCreated}
      />

      {/* Detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        currentUser={currentUser}
        clients={clients}
        users={users}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
}
