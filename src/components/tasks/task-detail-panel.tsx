"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Plus, Send } from "lucide-react";
import { initials } from "@/lib/formatting";
import { formatBRTDate, formatBRTDateTime } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskStatus, TaskPriority, TaskComment, TaskLabel } from "@prisma/client";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "A Fazer" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "DONE", label: "Concluído" },
  { value: "BLOCKED", label: "Bloqueado" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
];

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

type CommentWithUser = TaskComment & { user: { id: string; name: string } };

interface TaskDetailPanelProps {
  task: TaskWithRelations | null;
  onClose: () => void;
  currentUser: UserSummary;
  clients: { id: string; name: string }[];
  users: UserSummary[];
  onUpdated: (task: TaskWithRelations) => void;
  onDeleted: (taskId: string) => void;
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: "#6e7a70",
  marginBottom: 4,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 32,
  fontSize: 12,
  background: "#0f1813",
  border: "1px solid #1f2a23",
  color: "#a8b3aa",
  borderRadius: 6,
  padding: "0 8px",
  outline: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};

export function TaskDetailPanel({
  task,
  onClose,
  currentUser,
  clients,
  users,
  onUpdated,
  onDeleted,
}: TaskDetailPanelProps) {
  const { toast } = useToast();
  const isPrivileged = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setLabels(task.labels);
      setComments(task.comments);
      setNewComment("");
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patchTask(data: Record<string, unknown>): Promise<TaskWithRelations | null> {
    if (!task) return null;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erro ao atualizar");
      }
      const updated = await res.json() as TaskWithRelations;
      onUpdated(updated);
      return updated;
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
      return null;
    }
  }

  async function handleTitleBlur() {
    if (!task || title.trim() === task.title) return;
    if (!title.trim()) { setTitle(task.title); return; }
    await patchTask({ title: title.trim() });
  }

  async function handleDescriptionBlur() {
    if (!task) return;
    const val = description;
    const prev = task.description ?? "";
    if (val === prev) return;
    await patchTask({ description: val });
  }

  async function handleFieldChange(field: string, value: string | null) {
    await patchTask({ [field]: value });
  }

  async function handleLabelsChange(newLabels: { name: string; color: string }[]) {
    const updated = await patchTask({ labels: newLabels });
    if (updated) setLabels(updated.labels);
  }

  function addLabel() {
    if (!newLabelName.trim()) return;
    const updated = [...labels.map((l) => ({ name: l.name, color: l.color })), { name: newLabelName.trim(), color: newLabelColor }];
    handleLabelsChange(updated);
    setNewLabelName("");
  }

  function removeLabel(labelId: string) {
    const updated = labels.filter((l) => l.id !== labelId).map((l) => ({ name: l.name, color: l.color }));
    handleLabelsChange(updated);
  }

  async function handleSendComment() {
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao enviar comentário");
      const comment = await res.json() as CommentWithUser;
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar comentário");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!task || !confirm(`Deletar tarefa "${task.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
      toast({ title: "Tarefa deletada" });
      onDeleted(task.id);
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  if (!task) return null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: "fixed",
        insetBlock: 0,
        right: 0,
        zIndex: 50,
        width: "100%",
        maxWidth: 480,
        background: "#141f18",
        borderLeft: "1px solid #1f2a23",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", borderBottom: "1px solid #1f2a23", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              style={{
                width: "100%",
                background: "transparent",
                fontSize: 14,
                fontWeight: 600,
                color: "#e6efe8",
                border: "none",
                borderBottom: "1px solid transparent",
                outline: "none",
                paddingBottom: 2,
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderBottomColor = "#28342a")}
              onBlurCapture={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {isPrivileged && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Deletar tarefa"
                style={{ padding: 6, background: "transparent", border: "none", color: "#4a5450", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.5 : 1, borderRadius: 6 }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
              >
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            )}
            <button onClick={onClose} style={{ padding: 6, background: "transparent", border: "none", color: "#6e7a70", cursor: "pointer", borderRadius: 6 }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Properties */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2a23" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={fieldLabelStyle}>Status</p>
                <select value={task.status} onChange={(e) => handleFieldChange("status", e.target.value)} style={selectStyle}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p style={fieldLabelStyle}>Prioridade</p>
                <select value={task.priority} onChange={(e) => handleFieldChange("priority", e.target.value)} style={selectStyle}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p style={fieldLabelStyle}>Prazo</p>
                <input
                  type="date"
                  defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => handleFieldChange("dueDate", e.target.value || null)}
                  style={{
                    ...selectStyle,
                    color: isOverdue ? "#d85a4a" : "#a8b3aa",
                    borderColor: isOverdue ? "rgba(216,90,74,0.3)" : "#1f2a23",
                  }}
                />
              </div>
              <div>
                <p style={fieldLabelStyle}>Cliente</p>
                <select value={task.clientId ?? ""} onChange={(e) => handleFieldChange("clientId", e.target.value || null)} style={selectStyle}>
                  <option value="">Sem cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {isPrivileged && (
                <div style={{ gridColumn: "span 2" }}>
                  <p style={fieldLabelStyle}>Responsável</p>
                  <select value={task.assigneeId ?? ""} onChange={(e) => handleFieldChange("assigneeId", e.target.value || null)} style={selectStyle}>
                    <option value="">Sem responsável</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              {task.createdBy && (
                <div>
                  <p style={fieldLabelStyle}>Criado por</p>
                  <p style={{ fontSize: 13, color: "#a8b3aa" }}>{task.createdBy.name}</p>
                </div>
              )}
              <div>
                <p style={fieldLabelStyle}>Criado em</p>
                <p style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{formatBRTDate(task.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2a23" }}>
            <p style={fieldLabelStyle}>Descrição</p>
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Adicionar descrição..."
              rows={4}
              style={{
                width: "100%",
                background: "#0f1813",
                border: "1px solid #1f2a23",
                borderRadius: 8,
                color: "#a8b3aa",
                fontSize: 13,
                padding: "9px 14px",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Labels */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2a23" }}>
            <p style={fieldLabelStyle}>Etiquetas</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
              {labels.map((label) => (
                <span
                  key={label.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
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
                  <button onClick={() => removeLabel(label.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", opacity: 0.8, lineHeight: 1 }}>
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                placeholder="Nova etiqueta"
                style={{
                  flex: 1,
                  height: 28,
                  fontSize: 12,
                  background: "#0f1813",
                  border: "1px solid #1f2a23",
                  color: "#a8b3aa",
                  borderRadius: 6,
                  padding: "0 8px",
                  outline: "none",
                }}
              />
              <button onClick={addLabel} style={{ height: 28, width: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#182219", border: "1px solid #1f2a23", color: "#7DC128", borderRadius: 6, cursor: "pointer" }}>
                <Plus style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewLabelColor(c)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: c,
                    border: newLabelColor === c ? "2px solid #fff" : "2px solid transparent",
                    cursor: "pointer",
                    transform: newLabelColor === c ? "scale(1.2)" : "scale(1)",
                    transition: "transform .1s",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Comments */}
          <div style={{ padding: "16px 20px" }}>
            <p style={{ ...fieldLabelStyle, marginBottom: 12 }}>
              Comentários ({comments.length})
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {comments.map((comment) => {
                const canDeleteComment = isPrivileged || comment.userId === currentUser.id;
                return (
                  <div key={comment.id} style={{ display: "flex", gap: 10 }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector<HTMLButtonElement>(".delete-btn");
                      if (btn) btn.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector<HTMLButtonElement>(".delete-btn");
                      if (btn) btn.style.opacity = "0";
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #244a32, #15301f)",
                      border: "1px solid #284d36",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#9be03a",
                      flexShrink: 0,
                    }}>
                      {initials(comment.user.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#a8b3aa" }}>
                          {comment.user.name}
                        </span>
                        <span style={{ fontSize: 11, color: "#4a5450", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                          {formatBRTDateTime(comment.createdAt)}
                        </span>
                        {canDeleteComment && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteComment(comment.id)}
                            style={{ marginLeft: "auto", opacity: 0, background: "none", border: "none", cursor: "pointer", color: "#4a5450", transition: "all .15s", padding: 2, borderRadius: 4 }}
                            onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                            onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "#a8b3aa", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}

              {comments.length === 0 && (
                <p style={{ fontSize: 12, color: "#4a5450", textAlign: "center", padding: "16px 0" }}>
                  Nenhum comentário ainda
                </p>
              )}
            </div>

            {/* Comment input */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, #244a32, #15301f)",
                border: "1px solid #284d36",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "#9be03a",
                flexShrink: 0,
                marginTop: 2,
              }}>
                {initials(currentUser.name)}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 6 }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Adicionar comentário... (Ctrl+Enter)"
                  rows={2}
                  style={{
                    flex: 1,
                    background: "#0f1813",
                    border: "1px solid #1f2a23",
                    borderRadius: 8,
                    color: "#a8b3aa",
                    fontSize: 13,
                    padding: "8px 12px",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={sendingComment || !newComment.trim()}
                  style={{
                    alignSelf: "flex-end",
                    height: 32,
                    width: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#7DC128",
                    border: "none",
                    color: "#0a1408",
                    borderRadius: 8,
                    cursor: sendingComment || !newComment.trim() ? "not-allowed" : "pointer",
                    opacity: sendingComment || !newComment.trim() ? 0.5 : 1,
                    transition: "opacity .15s",
                    flexShrink: 0,
                  }}
                >
                  <Send style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
