"use client";

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
  TODO: "#6e7a70",
  IN_PROGRESS: "#7DC128",
  DONE: "#9be03a",
  BLOCKED: "#d85a4a",
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
    <div style={{
      display: "flex",
      flexDirection: "column",
      background: "#111a14",
      border: "1px solid #1f2a23",
      borderRadius: 10,
      minWidth: 280,
      flex: 1,
      maxHeight: "calc(100vh - 200px)",
    }}>
      {/* Column header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: "1px solid #1f2a23",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: STATUS_DOT_COLORS[status],
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            color: "#a8b3aa",
          }}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#7DC128",
          background: "rgba(125,193,40,0.1)",
          padding: "2px 7px",
          borderRadius: 20,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 8, minHeight: 80 }}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            currentUser={currentUser}
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, color: "#4a5450", fontSize: 12 }}>
            Nenhuma tarefa
          </div>
        )}
      </div>

      {/* Add task button */}
      <div style={{ padding: 8, borderTop: "1px solid #1f2a23", flexShrink: 0 }}>
        <button
          onClick={() => onNewTask(status)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            fontSize: 12,
            color: "#6e7a70",
            background: "transparent",
            border: "1px dashed #1f2a23",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all .15s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = "#7DC128"; e.currentTarget.style.borderColor = "rgba(125,193,40,0.3)"; e.currentTarget.style.background = "rgba(125,193,40,0.04)"; }}
          onMouseOut={(e) => { e.currentTarget.style.color = "#6e7a70"; e.currentTarget.style.borderColor = "#1f2a23"; e.currentTarget.style.background = "transparent"; }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Nova Tarefa
        </button>
      </div>
    </div>
  );
}
