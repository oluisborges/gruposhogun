"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { TaskColumn } from "./task-column";
import { TaskModal } from "./task-modal";
import { TaskDetailPanel } from "./task-detail-panel";
import { ManagerView } from "./manager-view";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskStatus, TaskPriority } from "@prisma/client";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];

interface TasksBoardProps {
  tasks: TaskWithRelations[];
  currentUser: UserSummary;
  clients: { id: string; name: string }[];
  users: UserSummary[];
}

const selectStyle: React.CSSProperties = {
  height: 34,
  fontSize: 13,
  background: "#0f1813",
  border: "1px solid #1f2a23",
  color: "#a8b3aa",
  borderRadius: 8,
  padding: "0 10px",
  outline: "none",
  cursor: "pointer",
};

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".02em",
          color: "#e6efe8",
          margin: 0,
        }}>
          Tarefas
        </h1>
        <button
          onClick={() => {
            setModalDefaultStatus("TODO");
            setModalOpen(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#7DC128",
            color: "#0a1408",
            fontSize: 13,
            padding: "9px 14px",
            borderRadius: 8,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Nova Tarefa
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#4a5450", pointerEvents: "none" }} />
          <input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...selectStyle,
              paddingLeft: 30,
              paddingRight: 12,
              width: 200,
              color: "#e6efe8",
            }}
          />
        </div>

        {isPrivileged && (
          <>
            <select value={filterAssigneeId} onChange={(e) => setFilterAssigneeId(e.target.value)} style={selectStyle}>
              <option value="">Todos os responsáveis</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} style={selectStyle}>
              <option value="">Todos os clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}

        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "")} style={selectStyle}>
          <option value="">Todas as prioridades</option>
          <option value="URGENT">Urgente</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Média</option>
          <option value="LOW">Baixa</option>
        </select>

        {isPrivileged && (
          <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", background: "#0f1813", border: "1px solid #1f2a23", borderRadius: 8, padding: 3, gap: 2 }}>
            {(["all", "byManager"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  transition: "all .15s",
                  background: viewMode === mode ? "#182219" : "transparent",
                  color: viewMode === mode ? "#e6efe8" : "#6e7a70",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                {mode === "all" ? "Geral" : "Por Gestor"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Board area */}
      {isPrivileged && viewMode === "byManager" ? (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <ManagerView
            tasks={filteredTasks}
            currentUser={currentUser}
            users={users}
            onTaskClick={setSelectedTask}
          />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, flex: 1, minHeight: 0 }}>
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
