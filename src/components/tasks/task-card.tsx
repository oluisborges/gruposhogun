"use client";

import { useState } from "react";
import { initials } from "@/lib/formatting";
import { formatBRTDate } from "@/lib/date-utils";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskPriority } from "@prisma/client";

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  LOW: { bg: "rgba(125,193,40,0.1)", text: "#7DC128" },
  MEDIUM: { bg: "rgba(232,167,58,0.1)", text: "#e8a73a" },
  HIGH: { bg: "rgba(216,90,74,0.1)", text: "#d85a4a" },
  URGENT: { bg: "rgba(216,90,74,0.18)", text: "#d85a4a" },
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
  const [hovered, setHovered] = useState(false);

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "linear-gradient(180deg, #141f18 0%, #111a14 100%)",
        border: `1px solid ${hovered ? "#28342a" : "#1f2a23"}`,
        borderRadius: 8,
        padding: 14,
        cursor: "pointer",
        transition: "border-color .15s",
      }}
    >
      {/* Title */}
      <p style={{
        fontSize: 13.5,
        fontWeight: 600,
        color: "#e6efe8",
        marginBottom: 8,
        lineHeight: 1.4,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {task.title}
      </p>

      {/* Client badge */}
      {task.client && (
        <div style={{ marginBottom: 8 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 11,
            padding: "2px 7px",
            borderRadius: 20,
            background: "rgba(125,193,40,0.1)",
            color: "#7DC128",
            fontWeight: 700,
            letterSpacing: ".04em",
          }}>
            {task.client.name}
          </span>
        </div>
      )}

      {/* Priority + Labels */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: 10.5,
          padding: "3px 7px",
          borderRadius: 20,
          background: PRIORITY_COLORS[task.priority].bg,
          color: PRIORITY_COLORS[task.priority].text,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.labels.map((label) => (
          <span
            key={label.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 10.5,
              padding: "3px 7px",
              borderRadius: 20,
              backgroundColor: label.color + "33",
              border: `1px solid ${label.color}55`,
              color: label.color,
              fontWeight: 700,
            }}
          >
            {label.name}
          </span>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        {/* Assignee avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {task.assignee ? (
            <>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "linear-gradient(135deg, #244a32, #15301f)",
                border: "1px solid #284d36",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                color: "#9be03a",
                flexShrink: 0,
              }}>
                {initials(task.assignee.name)}
              </div>
              <span style={{ fontSize: 11, color: "#6e7a70", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>
                {task.assignee.name.split(" ")[0]}
              </span>
            </>
          ) : (
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "1px dashed #28342a",
              flexShrink: 0,
            }} />
          )}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {isOverdue && (
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 6px",
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                background: "rgba(216,90,74,0.1)",
                color: "#d85a4a",
              }}>
                Vencida
              </span>
            )}
            <span style={{
              fontSize: 11,
              color: isOverdue ? "#d85a4a" : "#6e7a70",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatBRTDate(task.dueDate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
